import { Stream } from '@yeger/streams'
import { graphStratify, sugiyama } from 'd3-dag'
import { type Edge, type Node } from 'reactflow'

import type { TurboEdge, TurboGraph, TurboNode } from './turbo'

export type FlowGraph = ReturnType<typeof convertGraph>

export interface SizeConfig {
  width: number
  height: number
  horizontalSpacing: number
  verticalSpacing: number
}

export function convertGraph(graph: TurboGraph) {
  const hierarchy = createHierarchy(graph)
  const longestLine = getLongestLineLength(graph)
  const sizeConfig = createSizeConfig(longestLine)
  return createFlowGraph(hierarchy, graph.edges, sizeConfig)
}

function createHierarchy(graph: TurboGraph) {
  const stratify = graphStratify()
  return stratify([
    ...graph.nodes.map((node) => ({
      ...node,
      id: node.id,
      parentIds: graph.edges
        .filter((edge) => edge.target === node.id)
        .map(({ source }) => source),
    })),
  ])
}

function getLongestLineLength({ nodes }: TurboGraph) {
  const length = Math.max(
    ...Stream.from(nodes).flatMap(({ task, package: workspace }) => [
      task.length,
      workspace.length,
    ]),
  )
  if (length < 0) {
    return 1
  }
  return length
}

function createSizeConfig(longestLine: number): SizeConfig {
  return {
    width: longestLine * 10,
    height: 80,
    horizontalSpacing: 128,
    verticalSpacing: 128,
  }
}

export interface FlowNode extends TurboNode {
  isOrigin: boolean
  isTerminal: boolean
}

function createFlowGraph(
  hierarchy: ReturnType<typeof createHierarchy>,
  turboEdges: TurboEdge[],
  sizeConfig: SizeConfig,
) {
  const { width, height, horizontalSpacing, verticalSpacing } = sizeConfig
  const layout = sugiyama().nodeSize([
    width + horizontalSpacing,
    height + verticalSpacing,
  ])
  const layoutResult = layout(hierarchy)
  const nodes = Stream.from(hierarchy.nodes())
    .map<Node<FlowNode>>(
      (node) =>
        ({
          id: node.data.id,
          data: {
            ...node.data,
            isTerminal: node.nchildren() === 0,
            isOrigin: node.nparents() === 0,
          },
          position: { x: node.x, y: node.y },
          type: 'task',
        }) as const,
    )
    .toArray()
  const edges = turboEdges.map<Edge<TurboEdge>>((edge) => ({
    id: `edge-${edge.source}-${edge.target}`,
    source: edge.source,
    target: edge.target,
    animated: true,
    style: {
      stroke: `url(#${getEdgeGradient(edge.sourceTask, edge.targetTask)})`,
      width: 4,
    },
  }))
  return { nodes, edges, sizeConfig, layoutResult }
}

function normalizeTaskName(task: string) {
  return task
    .replaceAll(':', '-')
    .replaceAll('#', '-')
    .replaceAll('/', '-')
    .replaceAll('@', '-')
}

export function getEdgeGradient(sourceTask: string, targetTask: string) {
  return `edge-gradient-${normalizeTaskName(sourceTask)}-${normalizeTaskName(
    targetTask,
  )}`
}

export function getTaskColorVar(task: string) {
  return `--task-color-${normalizeTaskName(task)}`
}

export const TASK_WIDTH_VAR = '--task-width'
export const TASK_HEIGHT_VAR = '--task-height'
