export const STORE_LOCATION = {
  name: "Original Colormix LLC (OSCAR), Chigatay qishlog'i, Toshkent viloyati",
  lat: 41.348521,
  lng: 69.158870,
  mapsUrl: "https://maps.app.goo.gl/3UQiS5rZCUJdLDsf6",
};

export const DELIVERY_CONFIG = {
  baseFee: 10000,           // so'm — base fee covers first 3 km
  baseDistanceKm: 3,        // free distance included in base fee
  perKmFee: 2000,           // so'm — for each km beyond baseDistanceKm
  maxFee: 25000,            // so'm — cap, never charge more than this
  freeThresholdUsd: 100,    // if order total >= $100, delivery is free
  roadCoefficient: 1.35,    // multiply straight-line distance by this to estimate road distance
};

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km, straight-line
}

export function estimateRoadDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  coefficient = 1.35
): number {
  return haversineDistance(lat1, lng1, lat2, lng2) * coefficient;
}

export function calculateDeliveryFee(
  distanceKm: number,
  orderTotalUsd: number,
  config = DELIVERY_CONFIG
): { fee: number; isFree: boolean; reason: string } {
  // Free if order over threshold
  if (orderTotalUsd >= config.freeThresholdUsd) {
    return { fee: 0, isFree: true, reason: 'order_over_threshold' };
  }

  // Within base distance — only base fee
  if (distanceKm <= config.baseDistanceKm) {
    return { fee: config.baseFee, isFree: false, reason: 'base_only' };
  }

  // Beyond base distance — base fee + per-km
  const extraKm = Math.ceil(distanceKm - config.baseDistanceKm);
  const fee = Math.min(
    config.baseFee + extraKm * config.perKmFee,
    config.maxFee
  );
  return { fee, isFree: false, reason: 'base_plus_distance' };
}
