import * as c from "case";
import ts from "typescript";

import {
  ReferenceObject,
  SchemaObject,
  ResponseObject,
  RequestBodyObject,
  ParameterObject,
} from "openapi3-ts";
import { createWatermark } from "../core/createWatermark";
import { getUsedImports } from "../core/getUsedImports";
import { schemaToTypeAliasDeclaration } from "../core/schemaToTypeAliasDeclaration";
import { getEnumProperties } from "../utils/getEnumProperties";
import { ConfigBase, Context } from "./types";

import { isReferenceObject } from "openapi3-ts";

import { findCompatibleMediaType } from "../core/findCompatibleMediaType";
import { schemaToEnumDeclaration } from "../core/schemaToEnumDeclaration";

type Config = ConfigBase;

/**
 * Generate schemas types (components & responses)
 * @param context CLI Context
 * @param config Configuration
 */
export const generateSchemaTypes = async (
  context: Context,
  config: Config = {}
) => {
  const { components } = context.openAPIDocument;
  if (!components) {
    throw new Error("No components founds!");
  }

  const sourceFile = ts.createSourceFile(
    "index.ts",
    "",
    ts.ScriptTarget.Latest
  );

  const printer = ts.createPrinter({
    newLine: ts.NewLineKind.LineFeed,
    removeComments: false,
  });

  const printNodes = (nodes: ts.Node[]) =>
    nodes
      .map((node: ts.Node) => {
        return (
          printer.printNode(ts.EmitHint.Unspecified, node, sourceFile) +
          (ts.isJSDoc(node) ? "" : "\n")
        );
      })
      .join("\n");

  const generateComponentSchemaType = <
    T extends
      | SchemaObject
      | ReferenceObject
      | RequestBodyObject
      | ParameterObject
  >(
    componentSchemaEntries: [string, T][],
    componentTypeAliasHandler: (schema: [string, T][]) => ts.Node[]
  ) => {
    if (config.useEnums) {
      const enumSchemaEntries = getEnumProperties(componentSchemaEntries);
      const enumSchemas = enumSchemaEntries.reduce<ts.Node[]>(
        (mem, [name, schema]) => [
          ...mem,
          ...schemaToEnumDeclaration(name, schema, {
            openAPIDocument: context.openAPIDocument,
            currentComponent: "schemas",
          }),
        ],
        []
      );

      const componentsSchemas = componentTypeAliasHandler(
        componentSchemaEntries.filter(
          ([name]) => !enumSchemaEntries.some(([enumName]) => name === enumName)
        )
      );

      return [...enumSchemas, ...componentsSchemas];
    } else {
      const componentsSchemas = componentTypeAliasHandler(
        componentSchemaEntries
      );
      return [...componentsSchemas];
    }
  };

  const handleTypeAlias = (
    componentSchema: [string, SchemaObject | ReferenceObject][]
  ) =>
    componentSchema.reduce<ts.Node[]>(
      (mem, [name, schema]) => [
        ...mem,
        ...schemaToTypeAliasDeclaration(
          name,
          schema,
          {
            openAPIDocument: context.openAPIDocument,
            currentComponent: "schemas",
          },
          config.useEnums
        ),
      ],
      []
    );

  const handleResponseTypeAlias = (
    componentSchema: [
      string,
      ReferenceObject | RequestBodyObject | ResponseObject
    ][]
  ) =>
    componentSchema.reduce<ts.Node[]>((mem, [name, responseObject]) => {
      if (isReferenceObject(responseObject)) return mem;
      const mediaType = findCompatibleMediaType(responseObject);

      return [
        ...mem,
        ...schemaToTypeAliasDeclaration(
          name,
          mediaType?.schema || {},
          {
            openAPIDocument: context.openAPIDocument,
            currentComponent: "responses",
          },
          config.useEnums
        ),
      ];
    }, []);

  const handleRequestBodyTypeAlias = (
    componentSchema: [
      string,
      ReferenceObject | RequestBodyObject | ResponseObject
    ][]
  ) =>
    componentSchema.reduce<ts.Node[]>((mem, [name, requestBodyObject]) => {
      if (isReferenceObject(requestBodyObject)) return mem;
      const mediaType = findCompatibleMediaType(requestBodyObject);
      if (!mediaType || !mediaType.schema) return mem;

      return [
        ...mem,
        ...schemaToTypeAliasDeclaration(
          name,
          mediaType.schema,
          {
            openAPIDocument: context.openAPIDocument,
            currentComponent: "requestBodies",
          },
          config.useEnums
        ),
      ];
    }, []);

  const handleParamTypeAlias = (
    componentSchema: [string, ReferenceObject | ParameterObject][]
  ) =>
    componentSchema.reduce<ts.Node[]>((mem, [name, parameterObject]) => {
      if (isReferenceObject(parameterObject) || !parameterObject.schema) {
        return mem;
      }
      return [
        ...mem,
        ...schemaToTypeAliasDeclaration(
          name,
          parameterObject.schema,
          {
            openAPIDocument: context.openAPIDocument,
            currentComponent: "parameters",
          },
          config.useEnums
        ),
      ];
    }, []);

  const filenamePrefix =
    c.snake(config.filenamePrefix ?? context.openAPIDocument.info.title) + "-";

  const formatFilename = config.filenameCase ? c[config.filenameCase] : c.camel;
  const files = {
    requestBodies: formatFilename(filenamePrefix + "-request-bodies"),
    schemas: formatFilename(filenamePrefix + "-schemas"),
    parameters: formatFilename(filenamePrefix + "-parameters"),
    responses: formatFilename(filenamePrefix + "-responses"),
    utils: formatFilename(filenamePrefix + "-utils"),
  };

  // Generate `components/schemas` types
  if (components.schemas) {
    const componentSchemaEntries = Object.entries(components.schemas);
    const schemas: ts.Node[] = [];

    schemas.push(
      ...generateComponentSchemaType(componentSchemaEntries, handleTypeAlias)
    );

    await context.writeFile(
      files.schemas + ".ts",
      printNodes([
        createWatermark(context.openAPIDocument.info),
        ...getUsedImports(schemas, files).nodes,
        ...schemas,
      ])
    );
  }

  // Generate `components/responses` types
  if (components.responses) {
    const schemas: ts.Node[] = [];
    const componentsResponsesEntries = Object.entries(components.responses);
    schemas.push(
      ...generateComponentSchemaType(
        componentsResponsesEntries,
        handleResponseTypeAlias
      )
    );

    if (schemas.length) {
      await context.writeFile(
        files.responses + ".ts",
        printNodes([
          createWatermark(context.openAPIDocument.info),
          ...getUsedImports(schemas, files).nodes,
          ...schemas,
        ])
      );
    }
  }

  // Generate `components/requestBodies` types
  if (components.requestBodies) {
    const schemas: ts.Node[] = [];
    const componentsRequestBodiesEntries = Object.entries(
      components.requestBodies
    );
    schemas.push(
      ...generateComponentSchemaType(
        componentsRequestBodiesEntries,
        handleRequestBodyTypeAlias
      )
    );

    if (schemas.length) {
      await context.writeFile(
        files.requestBodies + ".ts",
        printNodes([
          createWatermark(context.openAPIDocument.info),
          ...getUsedImports(schemas, files).nodes,
          ...schemas,
        ])
      );
    }
  }

  // Generate `components/parameters` types
  if (components.parameters) {
    const schemas: ts.Node[] = [];
    const componentsParametersEntries = Object.entries(components.parameters);
    schemas.push(
      ...generateComponentSchemaType(
        componentsParametersEntries,
        handleParamTypeAlias
      )
    );

    await context.writeFile(
      files.parameters + ".ts",
      printNodes([
        createWatermark(context.openAPIDocument.info),
        ...getUsedImports(schemas, files).nodes,
        ...schemas,
      ])
    );
  }

  return {
    schemasFiles: files,
  };
};
