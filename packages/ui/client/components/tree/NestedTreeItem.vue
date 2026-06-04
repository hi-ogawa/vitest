<script setup lang="ts" generic="T">
import type { NestedTreeNode, NestedTreeNodeAttributes, NestedTreeNodeClass, NestedTreeNodeId, NestedTreeSlotProps } from './types'
import type { VNodeChild } from 'vue'
import { computed, ref } from 'vue'

defineOptions({
  name: 'NestedTreeItem',
})

const props = defineProps<{
  node: NestedTreeNode<T>
  depth: number
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

const collapsed = ref(props.defaultCollapsed ?? false)
const children = computed(() => props.node.children)
const hasChildren = computed(() => children.value.length > 0)
const selected = computed(() => props.selectedId === props.node.id)

function toggle() {
  if (hasChildren.value) {
    collapsed.value = !collapsed.value
  }
}
</script>

<template>
  <div>
    <div
      role="treeitem"
      :aria-selected="selected ? 'true' : undefined"
      :aria-expanded="hasChildren ? !collapsed : undefined"
    >
      <div
        role="button"
        tabindex="0"
        class="relative w-full text-left px-2 py-1 rounded text-sm"
        :class="getNodeClass?.(node, selected) ?? (selected ? 'bg-blue-500/20' : 'hover:bg-gray/10')"
        :style="{ paddingInlineStart: `calc(0.5rem + ${depth}rem)` }"
        v-bind="getNodeAttrs?.(node, selected) ?? {}"
        @click="emit('select', node.id)"
        @keydown.enter.prevent="emit('select', node.id)"
        @keydown.space.prevent="emit('select', node.id)"
      >
        <span
          v-if="depth > 0"
          class="absolute bottom-1 top-1 border-l border-gray/40 dark:border-gray/50"
          :style="{ insetInlineStart: `${depth}rem` }"
        />
        <span class="flex items-start gap-2">
          <button
            v-if="hasChildren"
            type="button"
            class="mt-0.5 h-4 w-4 flex flex-shrink-0 items-center justify-center opacity-70 hover:opacity-100"
            :aria-label="collapsed ? 'Expand' : 'Collapse'"
            @click.stop="toggle()"
          >
            <span :class="collapsed ? 'i-carbon:chevron-right' : 'i-carbon:chevron-down'" />
          </button>
          <span
            v-else
            class="mt-0.5 h-4 w-4 flex-shrink-0"
            aria-hidden="true"
          />
          <slot
            :node="node"
            :depth="depth"
            :selected="selected"
            :collapsed="collapsed"
            :has-children="hasChildren"
            :toggle="toggle"
          />
        </span>
      </div>
    </div>
    <template v-if="hasChildren && !collapsed">
      <NestedTreeItem
        v-for="child of children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
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
    </template>
  </div>
</template>
