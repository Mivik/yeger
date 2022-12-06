import { useQuery } from '@tanstack/react-query'
import {
  GraphController,
  Markers,
  PositionInitializers,
  defineGraph,
  defineGraphConfig,
  defineLink,
  defineNodeWithDefaults,
} from 'd3-graph-controller'
import { scaleOrdinal } from 'd3-scale'
import { schemeSet3 } from 'd3-scale-chromatic'
import Head from 'next/head'
import { useMemo, useRef, useState } from 'react'

import type { TurboGraph } from './api/graph'

export default function Home() {
  const [, setTrigger] = useState(0)
  const trigger = () => setTrigger((val) => val + 1)
  const query = useQuery({
    queryKey: ['graph'],
    queryFn: async () => {
      const res = await fetch('/api/graph')
      return (await res.json()) as TurboGraph
    },
  })

  const graphRef = useRef<HTMLDivElement>(null)
  const graphData = query.data

  const colors = useMemo(() => {
    const tasks = [
      ...new Set(graphData?.nodes.map(({ task }) => task) ?? []),
    ].sort()
    return scaleOrdinal(schemeSet3).domain(tasks)
  }, [graphData])

  const graphController = useMemo(() => {
    const container = graphRef.current
    if (!container || !graphData) {
      return undefined
    }
    const nodes = graphData.nodes.map((node) =>
      defineNodeWithDefaults({
        id: node.id,
        type: node.task,
        color: colors(node.task),
        label: { text: node.workspace, color: 'black', fontSize: '0.875rem' },
      })
    )
    const links = graphData.edges.map((edge) => {
      const source = nodes.find((node) => node.id === edge.source)!
      const target = nodes.find((node) => node.id === edge.target)!
      return defineLink({
        source,
        target,
        color: '#aaa',
        label: false,
      })
    })

    return new GraphController(
      container,
      defineGraph({ nodes, links }),
      defineGraphConfig({
        autoResize: true,
        hooks: {
          afterZoom(scale: number, xOffset: number, yOffset: number) {
            container.style.setProperty('--offset-x', `${xOffset}px`)
            container.style.setProperty('--offset-y', `${yOffset}px`)
            container.style.setProperty('--dot-size', `${scale}rem`)
          },
        },
        marker: Markers.Arrow(4),
        positionInitializer:
          nodes.length > 1
            ? PositionInitializers.Randomized
            : PositionInitializers.Centered,
        simulation: {
          forces: {
            link: { length: 200 },
            charge: {
              strength: 200,
            },
            collision: {
              radiusMultiplier: 10,
              strength: 300,
            },
          },
        },
        zoom: {
          min: 0.3,
          max: 2,
        },
      })
    )
  }, [graphRef, graphData])

  const tasks = graphController?.nodeTypes.sort() ?? []

  return (
    <div className="h-full w-full">
      <Head>
        <title>Turbo Graph</title>
        <meta
          name="description"
          content="Interactive visualization of Turborepo task graphs."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="h-full w-full flex flex-col">
        <div className=" border-gray-400 flex shadow-2xl z-10">
          <div className="flex gap-8 overflow-x-auto px-4 py-2">
            {tasks.map((task) => (
              <div key={task} className="flex gap-1 items-center">
                <input
                  type="checkbox"
                  checked={graphController?.nodeTypeFilter.includes(task)}
                  onChange={(event) => {
                    graphController?.filterNodesByType(
                      event.target.checked,
                      task
                    )
                    trigger()
                  }}
                />
                <label>{task}</label>
                <div
                  className="rounded-3xl h-4 w-4"
                  style={{ backgroundColor: colors(task) }}
                />
              </div>
            ))}
          </div>
          <div className="flex-1" />
          <button
            className="border-blue-200 bg-blue-200 border-1 border-2 px-2 py-1 rounded hover:bg-blue-300 transition-colors mx-4 my-2"
            onClick={() => graphController?.restart(0.5)}
          >
            Reset
          </button>
        </div>
        <div className="flex-1 relative">
          {!graphController ? (
            <div className="w-full h-full flex items-center justify-center absolute inset-0">
              <span className="text-gray-700">Loading</span>
            </div>
          ) : null}
          <div ref={graphRef} className="w-full h-full bg-gray-50 bg-dotted " />
        </div>
      </main>
    </div>
  )
}
