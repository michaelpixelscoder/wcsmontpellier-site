import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'

maplibregl.setWorkerUrl(maplibreWorkerUrl)

const mapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    openStreetMap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'open-street-map',
      type: 'raster',
      source: 'openStreetMap',
    },
  ],
}

export type MapLocation = {
  id: string
  latitude: number
  longitude: number
  title: string
  detail: string
}

export function ListingMap({ locations }: { locations: MapLocation[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRefs = useRef<maplibregl.Marker[]>([])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [3.8767, 43.6108],
      zoom: 11,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    mapRef.current = map

    return () => {
      mapRef.current = null
      map.remove()
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    markerRefs.current.forEach((marker) => marker.remove())
    markerRefs.current = locations.map((location) => {
      const content = document.createElement('div')
      const title = document.createElement('strong')
      const detail = document.createElement('p')
      title.textContent = location.title
      detail.textContent = location.detail
      detail.style.margin = '4px 0 0'
      content.append(title, detail)

      return new maplibregl.Marker({ color: '#c54b38' })
        .setLngLat([location.longitude, location.latitude])
        .setPopup(new maplibregl.Popup({ offset: 18 }).setDOMContent(content))
        .addTo(map)
    })

    if (locations.length > 0) {
      const bounds = new maplibregl.LngLatBounds()
      locations.forEach((location) => bounds.extend([location.longitude, location.latitude]))
      map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 0 })
    }
  }, [locations])

  return (
    <div
      className="h-[32rem] overflow-hidden rounded-xl border"
      ref={containerRef}
      role="region"
      aria-label={`Carte de ${locations.length} lieux de cours autour de Montpellier`}
    />
  )
}
