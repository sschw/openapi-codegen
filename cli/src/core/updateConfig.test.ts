import ts from "typescript";
import { updateConfig } from "./updateConfig";

describe("updateConfig", () => {
  const configProperty = ts.factory.createPropertyAssignment(
    "test",
    ts.factory.createObjectLiteralExpression([], false),
  );

  it("should add import statement if not already existing", () => {
    const sourceText = `import { defineConfig } from "@sschw/openapi-codegen-cli";
    
    // This comment should stay
    export default defineConfig({})`;
    const sourceFile = ts.createSourceFile(
      "openapi-codegen.config.ts",
      sourceText,
      ts.ScriptTarget.Latest,
    );

    const transformedSourceFile = updateConfig({
      sourceFile,
      existingImports: ["@sschw/openapi-codegen-cli"],
      importsToInsert: [
        {
          namedImports: ["generateReactQueryComponents", "generateSchemaTypes"],
          module: "@sschw/openapi-codegen-typescript",
        },
      ],
      configProperty,
    });

    expect(printer.printFile(transformedSourceFile)).toMatchInlineSnapshot(`
     "import { generateReactQueryComponents, generateSchemaTypes } from "@sschw/openapi-codegen-typescript";
     import { defineConfig } from "@sschw/openapi-codegen-cli";
     // This comment should stay
     export default defineConfig({
         test: {}
     });
     "
    `);
  });

  it("should update import statement if already existing", () => {
    const sourceText = `import { defineConfig } from "@sschw/openapi-codegen-cli";
    import { renameComponent } from "@sschw/openapi-codegen-typescript";

    export default defineConfig({
      plop: {}
    })`;
    const sourceFile = ts.createSourceFile(
      "openapi-codegen.config.ts",
      sourceText,
      ts.ScriptTarget.Latest,
    );

    const transformedSourceFile = updateConfig({
      sourceFile,
      existingImports: [
        "@sschw/openapi-codegen-cli",
        "@sschw/openapi-codegen-typescript",
      ],
      importsToInsert: [
        {
          namedImports: ["generateReactQueryComponents", "generateSchemaTypes"],
          module: "@sschw/openapi-codegen-typescript",
        },
      ],
      configProperty,
    });

    expect(printer.printFile(transformedSourceFile)).toMatchInlineSnapshot(`
     "import { defineConfig } from "@sschw/openapi-codegen-cli";
     import { renameComponent, generateReactQueryComponents, generateSchemaTypes } from "@sschw/openapi-codegen-typescript";
     export default defineConfig({
         plop: {},
         test: {}
     });
     "
    `);
  });

  it("should not create duplicates imports", () => {
    const sourceText = `import { defineConfig } from "@sschw/openapi-codegen-cli";
    import { renameComponent, generateReactQueryComponents } from "@sschw/openapi-codegen-typescript";

    export default defineConfig({})`;
    const sourceFile = ts.createSourceFile(
      "openapi-codegen.config.ts",
      sourceText,
      ts.ScriptTarget.Latest,
    );

    const transformedSourceFile = updateConfig({
      sourceFile,
      existingImports: [
        "@sschw/openapi-codegen-cli",
        "@sschw/openapi-codegen-typescript",
      ],
      importsToInsert: [
        {
          namedImports: ["generateReactQueryComponents", "generateSchemaTypes"],
          module: "@sschw/openapi-codegen-typescript",
        },
      ],
      configProperty,
    });

    expect(printer.printFile(transformedSourceFile)).toMatchInlineSnapshot(`
     "import { defineConfig } from "@sschw/openapi-codegen-cli";
     import { renameComponent, generateReactQueryComponents, generateSchemaTypes } from "@sschw/openapi-codegen-typescript";
     export default defineConfig({
         test: {}
     });
     "
    `);
  });
});

// Helpers
const printer = ts.createPrinter({
  newLine: ts.NewLineKind.LineFeed,
  removeComments: false,
});
