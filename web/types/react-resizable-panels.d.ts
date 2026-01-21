declare module 'react-resizable-panels' {
  import * as React from 'react';

  export interface PanelGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    direction?: 'horizontal' | 'vertical';
    autoSaveId?: string;
    onLayout?: (sizes: number[]) => void;
    storage?: typeof localStorage;
    storageKey?: string;
    children?: React.ReactNode;
  }

  export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
    collapsible?: boolean;
    collapsedSize?: number;
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    order?: number;
    children?: React.ReactNode;
    onCollapse?: (collapsed: boolean) => void;
    onExpand?: () => void;
    onResize?: (size: number) => void;
  }

  export interface PanelResizeHandleProps extends React.HTMLAttributes<HTMLDivElement> {
    disabled?: boolean;
    id?: string;
    onDragging?: (isDragging: boolean) => void;
    children?: React.ReactNode;
  }

  export const PanelGroup: React.ForwardRefExoticComponent<
    PanelGroupProps & React.RefAttributes<HTMLDivElement>
  >;

  export const Panel: React.ForwardRefExoticComponent<
    PanelProps & React.RefAttributes<HTMLDivElement>
  >;

  export const PanelResizeHandle: React.ForwardRefExoticComponent<
    PanelResizeHandleProps & React.RefAttributes<HTMLDivElement>
  >;
}
