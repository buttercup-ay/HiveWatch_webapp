export const THRESHOLDS = {
  temp_brood: { min: 33.0, max: 37.0, unit: '°C', label: 'Brood Temperature' },
  temp_super: { min: 18.0, max: 35.0, unit: '°C', label: 'Super Temperature' },
  hum_brood:  { min: 50.0, max: 85.0, unit: '%',  label: 'Brood Humidity' },
  hum_super:  { min: 40.0, max: 80.0, unit: '%',  label: 'Super Humidity' },
  pres_brood: { min: 980,  max: 1050, unit: 'hPa', label: 'Brood Pressure' },
  pres_super: { min: 980,  max: 1050, unit: 'hPa', label: 'Super Pressure' },
};
