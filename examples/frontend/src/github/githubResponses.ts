/**
 * Generated by @sschw/openapi-codegen
 *
 * @version 1.1.4
 */
import type * as Schemas from "./githubSchemas";

export type BadRequest = Schemas.BasicError;

export type CodeScanningForbiddenRead = Schemas.BasicError;

export type CodeScanningForbiddenWrite = Schemas.BasicError;

export type Conflict = Schemas.BasicError;

export type Forbidden = Schemas.BasicError;

export type ForbiddenGist = {
  block?: {
    created_at?: string;
    html_url?: string | null;
    reason?: string;
  };
  documentation_url?: string;
  message?: string;
};

export type Found = void;

export type Gone = Schemas.BasicError;

export type InternalError = Schemas.BasicError;

export type MovedPermanently = void;

export type NotFound = Schemas.BasicError;

export type NotModified = void;

export type PreviewHeaderMissing = {
  documentation_url: string;
  message: string;
};

export type RequiresAuthentication = Schemas.BasicError;

export type ScimBadRequest = Schemas.ScimError;

export type ScimConflict = Schemas.ScimError;

export type ScimForbidden = Schemas.ScimError;

export type ScimInternalError = Schemas.ScimError;

export type ScimNotFound = Schemas.ScimError;

export type ServiceUnavailable = {
  code?: string;
  documentation_url?: string;
  message?: string;
};

export type ValidationFailed = Schemas.ValidationError;

export type ValidationFailedSimple = Schemas.ValidationErrorSimple;
