import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../firebase';
import { THRESHOLDS } from '../thresholds';

export function useThresholds() {
  const [thresholds, setThresholds] = useState(THRESHOLDS);

  useEffect(() => {
    const threshRef = ref(db, 'hive_001/thresholds');
    const unsubscribe = onValue(threshRef, (snapshot) => {
      const fbData = snapshot.val();
      if (fbData) {
        const merged = { ...THRESHOLDS };
        Object.keys(THRESHOLDS).forEach((key) => {
          if (fbData[key]) {
            merged[key] = {
              ...THRESHOLDS[key],
              min: fbData[key].min ?? THRESHOLDS[key].min,
              max: fbData[key].max ?? THRESHOLDS[key].max,
            };
          }
        });
        setThresholds(merged);
      } else {
        setThresholds(THRESHOLDS);
      }
    });
    return () => unsubscribe();
  }, []);

  return thresholds;
}
