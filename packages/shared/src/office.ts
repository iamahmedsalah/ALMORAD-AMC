/** Office address supplied and approved by the owner on 12 November 2026. */
export const officeAddress = {
  en: '18 Zaki Ragab Street, High Class 1 Tower, Floor 7',
  ar: '١٨ شارع زكي رجب، برج هاي كلاس ١، الدور السابع'
} as const;

/** Verified Google Maps office location supplied by the owner on 15 November 2026. */
export const officeLocation = {
  name: 'ALMORAD AMC',
  address: officeAddress,
  locality: {
    en: 'Smouha, Alexandria Governorate, Egypt',
    ar: 'سموحة، محافظة الإسكندرية، مصر',
  },
  addressLocality: {
    en: 'Smouha',
    ar: 'سموحة',
  },
  addressRegion: {
    en: 'Alexandria Governorate',
    ar: 'محافظة الإسكندرية',
  },
  addressCountry: 'EG',
  coords: {
    lat: 31.2075855,
    lng: 29.9365845,
  },
  placeId: 'ChIJPSldNk_Y7kkRBxgjOErbf5E',
  directionsUrl:
    'https://www.google.com/maps/search/?api=1&query=31.2075855,29.9365845&query_place_id=ChIJPSldNk_Y7kkRBxgjOErbf5E',
} as const;
