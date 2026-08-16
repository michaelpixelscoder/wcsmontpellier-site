import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'

type ListingMapProps = {
  latitude?: number
  longitude?: number
}

export function ListingMap({ latitude = 43.6108, longitude = 3.8767 }: ListingMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [longitude, latitude],
      zoom: 11,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    return () => map.remove()
  }, [latitude, longitude])

  return (
    <div
      className="h-96 overflow-hidden rounded-xl border"
      ref={containerRef}
      role="region"
      aria-label="Carte des cours et événements autour de Montpellier"
    />
  )
}
