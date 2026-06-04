<script setup lang="ts" generic="T">
import type { NestedTreeNode, NestedTreeNodeAttributes, NestedTreeNodeClass, NestedTreeNodeId, NestedTreeSlotProps } from './types'
import type { VNodeChild } from 'vue'
import NestedTreeItem from './NestedTreeItem.vue'

defineProps<{
  nodes: NestedTreeNode<T>[]
  selectedId?: NestedTreeNodeId
  defaultCollapsed?: boolean
  getNodeClass?: (node: NestedTreeNode<T>, selected: boolean) => NestedTreeNodeClass
  getNodeAttrs?: (node: NestedTreeNode<T>, selected: boolean) => NestedTreeNodeAttributes
}>()

const emit = defineEmits<{
  select: [id: NestedTreeNodeId]
}>()

defineSlots<{
  default?: (props: NestedTreeSlotProps<T>) => VNodeChild
}>()
</script>

<template>
  <div role="tree">
    <NestedTreeItem
      v-for="node of nodes"
      :key="node.id"
      :node="node"
      :depth="0"
      :selected-id="selectedId"
      :default-collapsed="defaultCollapsed"
      :get-node-class="getNodeClass"
      :get-node-attrs="getNodeAttrs"
      @select="emit('select', $event)"
    >
      <template #default="slotProps">
        <slot v-bind="slotProps" />
      </template>
    </NestedTreeItem>
  </div>
</template>
