import { useEffect } from 'react';
import { ref, onChildAdded } from 'firebase/database';
import { db } from '../firebase';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext'; // Updated import path
import { THRESHOLDS } from '../thresholds';

export default function AlertToast() {
  const { user, hiveId } = useAuth();

  useEffect(() => {
    if (!user || !hiveId) return;

    const unsubscribers = [];

    // Intrusion alerts
    const intrRef = ref(db, `${hiveId}/alerts/intrusion_alerts`);
    let firstIntr = true;
    const u1 = onChildAdded(intrRef, (snap) => {
      if (firstIntr) { firstIntr = false; return; }
      const data = snap.val();
      toast.error(`⚠ INTRUSION — ${data?.source || 'Unknown'} side`, {
        autoClose: 8000,
        closeOnClick: false,
      });
    });
    unsubscribers.push(u1);

    // Weight/theft alerts
    const wtRef = ref(db, `${hiveId}/alerts/weight_alerts`);
    let firstWt = true;
    const u2 = onChildAdded(wtRef, (snap) => {
      if (firstWt) { firstWt = false; return; }
      toast.error(`🚨 THEFT ALERT — ${snap.val()?.message || 'Weight anomaly detected'}`, {
        autoClose: 8000,
        closeOnClick: false,
      });
    });
    unsubscribers.push(u2);

    // Threshold alerts
    const thrRef = ref(db, `${hiveId}/alerts/threshold_alerts`);
    let firstThr = true;
    const u3 = onChildAdded(thrRef, (snap) => {
      if (firstThr) { firstThr = false; return; }
      const data = snap.val();
      const param = data?.parameter || 'sensor';
      const label = THRESHOLDS[param]?.label || param;
      toast.warning(`⚠ ${label} out of safe range`, {
        autoClose: 5000,
        style: { background: '#FEF3C7', color: '#92400E' },
      });
    });
    unsubscribers.push(u3);

    return () => unsubscribers.forEach((u) => u());
  }, [user, hiveId]);

  return null;
}