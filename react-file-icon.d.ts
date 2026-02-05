declare module "react-file-icon" {
  import type * as React from "react";

  export type IconType =
    | "3d"
    | "acrobat"
    | "audio"
    | "binary"
    | "code"
    | "compressed"
    | "document"
    | "drive"
    | "font"
    | "image"
    | "presentation"
    | "settings"
    | "spreadsheet"
    | "vector"
    | "video";

  export interface FileIconProps {
    color?: string;
    extension?: string;
    fold?: boolean;
    foldColor?: string;
    glyphColor?: string;
    gradientColor?: string;
    gradientOpacity?: number;
    labelColor?: string;
    labelTextColor?: string;
    labelUppercase?: boolean;
    radius?: number;
    type?: IconType;
  }

  export const FileIcon: React.FunctionComponent<FileIconProps>;
  export const defaultStyles: Record<string, Partial<FileIconProps>>;
}
