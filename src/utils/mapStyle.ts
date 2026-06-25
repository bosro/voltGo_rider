/**
 * Custom Google Maps style — light grey / minimal
 * Matches the muted cartographic look in the VoltGO screenshots.
 *
 * Usage:
 *   import CUSTOM_MAP_STYLE from '../../utils/mapStyle';
 *   <MapView customMapStyle={CUSTOM_MAP_STYLE} ... />
 */
const CUSTOM_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f0f4f8" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a9bb0" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f0f4f8" }] },
  {
    featureType: "administrative",
    elementType: "geometry",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a0aec0" }],
  },
  {
    featureType: "poi",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#d8eacc" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8aaa70" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#d8e2ed" }],
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#8a9bb0" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#e8eff5" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#c8d8e8" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7a8da0" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9aabb8" }],
  },
  {
    featureType: "transit",
    stylers: [{ visibility: "off" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c8dce8" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#7a98b0" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#f8f8f8" }],
  },
  {
    featureType: "road.local",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  { featureType: "poi.business", stylers: [{ visibility: "on" }] }, // show shops/restaurants
  { featureType: "poi.medical", stylers: [{ visibility: "on" }] }, // show hospitals
  { featureType: "poi.school", stylers: [{ visibility: "on" }] }, // show schools
  { featureType: "transit.station", stylers: [{ visibility: "on" }] }, // show bus/train stops
  {
    featureType: "landscape.man_made",
    elementType: "geometry",
    stylers: [{ color: "#e8edf2" }],
  },
];

export default CUSTOM_MAP_STYLE;
