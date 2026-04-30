// Custom map style for Balinsky.
// Calm premium palette: warm sand land, soft sage-mint water, light tan roads,
// muted brown labels. POI/icon clutter is suppressed.

export const BALINSKY_MAP_STYLE: google.maps.MapTypeStyle[] = [
  // Base
  { elementType: 'geometry', stylers: [{ color: '#F2EAD8' }] }, // warm sand land
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7A6A55' }] }, // soft brown
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }, { weight: 2 }] },

  // Water — soft sage / muted mint
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#C6DCD3' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#6B8A7E' }] },

  // Land cover variants
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#EDE3CF' }] },
  { featureType: 'landscape.man_made', elementType: 'geometry', stylers: [{ color: '#F2EAD8' }] },

  // Parks & nature — slightly cooler than sand
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#D7E4D2' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6B7B62' }] },

  // Suppress POI clutter
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },

  // Roads — light tan
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FAF3E1' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E8DEC2' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#F4E8C8' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#E2D2A4' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#F8EFD7' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#FAF3E1' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8C7B62' }] },

  // Transit
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },

  // Administrative
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#D6CDB8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#3A322A' }] },
  { featureType: 'administrative.neighborhood', elementType: 'labels.text.fill', stylers: [{ color: '#7A6A55' }] },
]
