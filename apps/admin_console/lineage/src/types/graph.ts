export interface GraphNode {
  id: string;
  type: string;
  name: string;
  full_name?: string;
  status?: string;
  label?: string;
  [key: string]: any;
}

export interface GraphEdge {
  source: string;
  target: string;
  type?: string;
}

export interface GraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type LayoutOrientation = "LR" | "TB";
export type SelectionType = "job" | "table";

export interface Selection {
  type: SelectionType;
  id?: string;
  jobId?: string;
  tableName?: string;
}

export type SelectHandler = (selection: Selection | null) => void;

export interface ContextMenuState {
  x: number;
  y: number;
  node: GraphNode;
}
