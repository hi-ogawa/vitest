import type { HTMLAttributes } from 'vue'

export type NestedTreeNodeId = string | number

export interface NestedTreeNode<T = unknown> {
  id: NestedTreeNodeId
  data: T
  children: NestedTreeNode<T>[]
}

export type NestedTreeNodeClass = HTMLAttributes['class']
export type NestedTreeNodeAttributes = Record<string, unknown>

export interface NestedTreeSlotProps<T = unknown> {
  node: NestedTreeNode<T>
  depth: number
  selected: boolean
  collapsed: boolean
  hasChildren: boolean
  toggle: () => void
}
