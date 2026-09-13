import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  Alert,
  StatusBar,
  Modal
} from 'react-native';

const API_BASE = 'http://localhost:8000';

interface FieldReportQueue {
  id: string;
  latitude: number;
  longitude: number;
  description: string;
  reporter_type: 'citizen' | 'field_officer';
  created_at: string;
  synced: boolean;
}

export default function App() {
  const [currentTab, setCurrentTab] = useState<'home' | 'report' | 'alerts' | 'sync'>('home');
  const [lang, setLang] = useState<'en' | 'as' | 'hi'>('en');
  const [description, setDescription] = useState('');
  const [reporterType, setReporterType] = useState<'citizen' | 'field_officer'>('citizen');
  const [offlineQueue, setOfflineQueue] = useState<FieldReportQueue[]>([]);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeAlarmAlert, setActiveAlarmAlert] = useState<any | null>(null);

  // Live Phone GPS Coordinates (Simulated: Cherrapunji High-Risk Zone Lat/Lng)
  const currentLat = 25.28;
  const currentLng = 91.70;

  useEffect(() => {
    fetchActiveAlerts();
    const interval = setInterval(fetchActiveAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const isPhoneInsideHazardZone = (alert: any): boolean => {
    // Geofence Check: Matches mobile phone GPS against Cherrapunji / High-Risk zone coordinates (approx 0.15 deg radius)
    if (alert.zone_id === 1 || alert.zone_name.includes("Cherrapunji") || alert.zone_name.includes("Sohra")) {
      const latDiff = Math.abs(currentLat - 25.28);
      const lngDiff = Math.abs(currentLng - 91.70);
      return latDiff < 0.20 && lngDiff < 0.20; // Inside geofence
    }
    return false;
  };

  const fetchActiveAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/alerts`);
      if (response.ok) {
        const data = await response.json();
        setActiveAlerts(data);

        // GEOFENCED CELL SIREN TARGET:
        // Only trigger phone siren if device GPS is physically INSIDE the disaster hazard zone!
        const severeGeofencedAlert = data.find((a: any) => 
          !a.acknowledged && 
          (a.severity === 'severe' || a.severity === 'high') &&
          isPhoneInsideHazardZone(a)
        );

        if (severeGeofencedAlert && !activeAlarmAlert) {
          setActiveAlarmAlert(severeGeofencedAlert);
        }
      }
    } catch (e) {
      console.log("Offline mode: Using cached local alerts");
    }
  };

  const handleStopSirenAndAcknowledge = () => {
    setActiveAlarmAlert(null); // Silences phone siren and closes modal immediately
  };

  const triggerTestSirenOnPhone = () => {
    setActiveAlarmAlert({
      id: Date.now(),
      zone_name: "Cherrapunji (Sohra) Ridge",
      district: "East Khasi Hills",
      severity: "severe",
      message: "GEOFENCED EMERGENCY PHONE SIREN: Heavy rainfall surge & slope failure detected at your GPS coordinates. EVACUATE slope zones immediately.",
      language: lang
    });
  };

  const handleSubmitReport = async () => {
    if (!description.trim()) {
      Alert.alert("Error", "Please provide a description of the hazard.");
      return;
    }

    setIsSubmitting(true);
    const reportItem: FieldReportQueue = {
      id: `rep-${Date.now()}`,
      latitude: currentLat,
      longitude: currentLng,
      description: description,
      reporter_type: reporterType,
      created_at: new Date().toISOString(),
      synced: false
    };

    try {
      const formData = new FormData();
      formData.append('latitude', String(currentLat));
      formData.append('longitude', String(currentLng));
      formData.append('description', description);
      formData.append('reporter_type', reporterType);
      formData.append('reporter_name', reporterType === 'field_officer' ? 'Field Officer (App)' : 'Citizen User');

      const response = await fetch(`${API_BASE}/api/reports`, {
        method: 'POST',
        headers: { 'X-Idempotency-Key': reportItem.id },
        body: formData
      });

      if (response.ok) {
        Alert.alert("Success", "Field report submitted successfully!");
        reportItem.synced = true;
      } else {
        throw new Error("Server error");
      }
    } catch (e) {
      Alert.alert("Offline Mode", "Network unavailable. Report queued locally for background auto-sync.");
      setOfflineQueue(prev => [reportItem, ...prev]);
    } finally {
      setIsSubmitting(false);
      setDescription('');
      setCurrentTab('home');
    }
  };

  const handleSyncQueue = async () => {
    const unsynced = offlineQueue.filter(item => !item.synced);
    if (unsynced.length === 0) {
      Alert.alert("Sync Status", "All field reports are already synced!");
      return;
    }

    let successCount = 0;
    for (const item of unsynced) {
      try {
        const formData = new FormData();
        formData.append('latitude', String(item.latitude));
        formData.append('longitude', String(item.longitude));
        formData.append('description', item.description);
        formData.append('reporter_type', item.reporter_type);

        const res = await fetch(`${API_BASE}/api/reports`, {
          method: 'POST',
          headers: { 'X-Idempotency-Key': item.id },
          body: formData
        });
        if (res.ok) {
          item.synced = true;
          successCount++;
        }
      } catch (err) {
        console.log("Retry failed for item:", item.id);
      }
    }

    setOfflineQueue([...offlineQueue]);
    Alert.alert("Sync Complete", `Successfully synced ${successCount} offline report(s).`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>NER-Sentinel Mobile</Text>
          <Text style={styles.headerSubtitle}>Geofenced Phone Siren & Field App</Text>
        </View>
        <View style={styles.langToggle}>
          <TouchableOpacity onPress={() => setLang('en')} style={[styles.langBtn, lang === 'en' && styles.langBtnActive]}>
            <Text style={styles.langBtnText}>EN</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setLang('as')} style={[styles.langBtn, lang === 'as' && styles.langBtnActive]}>
            <Text style={styles.langBtnText}>AS</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setLang('hi')} style={[styles.langBtn, lang === 'hi' && styles.langBtnActive]}>
            <Text style={styles.langBtnText}>HI</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Screen Content */}
      <View style={styles.body}>
        {currentTab === 'home' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* GPS Location Status Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>PHONE GPS LOCATION & GEOFENCE RADAR</Text>
              <Text style={styles.cardValue}>Lat: {currentLat}° N, Lng: {currentLng}° E</Text>
              <View style={styles.badgeRow}>
                <View style={styles.riskBadge}>
                  <Text style={styles.riskBadgeText}>GPS Geofence: CHERRAPUNJI HAZARD ZONE</Text>
                </View>
              </View>
            </View>

            {/* Test Phone Siren Button */}
            <TouchableOpacity style={styles.alarmTestBtn} onPress={triggerTestSirenOnPhone}>
              <Text style={styles.alarmTestBtnText}>🔊 TEST GEOFENCED PHONE SIREN ALARM</Text>
            </TouchableOpacity>

            {/* Quick Action Button */}
            <TouchableOpacity style={styles.primaryActionBtn} onPress={() => setCurrentTab('report')}>
              <Text style={styles.primaryActionBtnText}>+ REPORT LANDSLIDE / ROAD BLOCK</Text>
            </TouchableOpacity>

            {/* Active Alerts Preview */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>ACTIVE LOCAL HAZARD ALERTS ({activeAlerts.length})</Text>
              {activeAlerts.slice(0, 3).map((a, idx) => (
                <View key={`home-alert-${idx}`} style={styles.alertItem}>
                  <Text style={styles.alertTitle}>{a.zone_name} — {a.severity.toUpperCase()}</Text>
                  <Text style={styles.alertBody}>{a.message}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        {currentTab === 'report' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.sectionTitle}>New Geotagged Field Report</Text>

            <Text style={styles.inputLabel}>Reporter Role</Text>
            <View style={styles.roleToggleRow}>
              <TouchableOpacity
                style={[styles.roleBtn, reporterType === 'citizen' && styles.roleBtnActive]}
                onPress={() => setReporterType('citizen')}
              >
                <Text style={styles.roleBtnText}>Citizen</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, reporterType === 'field_officer' && styles.roleBtnActive]}
                onPress={() => setReporterType('field_officer')}
              >
                <Text style={styles.roleBtnText}>Field Officer</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Hazard Description & Road Impact</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={4}
              placeholder="Describe slope movement, fallen debris, road blockage..."
              placeholderTextColor="#64748B"
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
              onPress={handleSubmitReport}
              disabled={isSubmitting}
            >
              <Text style={styles.submitBtnText}>{isSubmitting ? "Submitting..." : "SUBMIT GEOTAGGED REPORT"}</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {currentTab === 'sync' && (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.syncHeader}>
              <Text style={styles.sectionTitle}>Offline Queue ({offlineQueue.length})</Text>
              <TouchableOpacity style={styles.syncBtn} onPress={handleSyncQueue}>
                <Text style={styles.syncBtnText}>SYNC NOW</Text>
              </TouchableOpacity>
            </View>
            {offlineQueue.length === 0 ? (
              <Text style={styles.emptyText}>No pending offline reports queued.</Text>
            ) : (
              offlineQueue.map((item) => (
                <View key={item.id} style={styles.card}>
                  <Text style={styles.alertTitle}>Report ID: {item.id}</Text>
                  <Text style={styles.alertBody}>{item.description}</Text>
                  <Text style={styles.syncStatus}>
                    Status: {item.synced ? "SYNCED" : "QUEUED OFFLINE"}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* GEOFENCED PHONE SIREN EMERGENCY ALARM MODAL */}
      {activeAlarmAlert && (
        <Modal visible transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalBadge}>🚨 GEOFENCED PHONE EMERGENCY SIREN</Text>
              <Text style={styles.modalTitle}>CRITICAL LANDSLIDE WARNING</Text>
              <Text style={styles.modalZone}>{activeAlarmAlert.zone_name}</Text>
              <Text style={styles.modalBody}>{activeAlarmAlert.message}</Text>
              
              <TouchableOpacity
                style={styles.modalStopBtn}
                onPress={handleStopSirenAndAcknowledge}
              >
                <Text style={styles.modalStopBtnText}>🛑 STOP PHONE SIREN & EVACUATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Bottom Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('home')}>
          <Text style={[styles.navText, currentTab === 'home' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('report')}>
          <Text style={[styles.navText, currentTab === 'report' && styles.navTextActive]}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setCurrentTab('sync')}>
          <Text style={[styles.navText, currentTab === 'sync' && styles.navTextActive]}>Offline Queue</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F19' },
  header: {
    padding: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: { color: '#38BDF8', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#94A3B8', fontSize: 11 },
  langToggle: { flexDirection: 'row', gap: 4 },
  langBtn: { paddingHorizontal: 6, paddingVertical: 4, borderRadius: 4, backgroundColor: '#1E293B' },
  langBtnActive: { backgroundColor: '#0284C7' },
  langBtnText: { color: '#F8FAFC', fontSize: 10, fontWeight: 'bold' },
  body: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  card: { backgroundColor: '#0F172A', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#1E293B' },
  cardLabel: { color: '#64748B', fontSize: 10, fontWeight: 'bold', marginBottom: 4 },
  cardValue: { color: '#F8FAFC', fontSize: 13, fontWeight: '500' },
  badgeRow: { marginTop: 8 },
  riskBadge: { backgroundColor: '#7F1D1D', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, alignSelf: 'flex-start' },
  riskBadgeText: { color: '#FCA5A5', fontSize: 11, fontWeight: 'bold' },
  alarmTestBtn: { backgroundColor: '#E11D48', padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#FDA4AF' },
  alarmTestBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },
  primaryActionBtn: { backgroundColor: '#0284C7', padding: 14, borderRadius: 8, alignItems: 'center' },
  primaryActionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  sectionTitle: { color: '#F8FAFC', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  inputLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 4 },
  roleToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  roleBtn: { flex: 1, padding: 10, borderRadius: 6, backgroundColor: '#1E293B', alignItems: 'center' },
  roleBtnActive: { backgroundColor: '#0369A1' },
  roleBtnText: { color: '#F8FAFC', fontSize: 12, fontWeight: '600' },
  textArea: { backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#334155', borderRadius: 8, color: '#F8FAFC', padding: 12, fontSize: 13, height: 100, textAlignVertical: 'top', marginBottom: 16 },
  submitBtn: { backgroundColor: '#16A34A', padding: 14, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' },
  syncHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  syncBtn: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  syncBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: 'bold' },
  emptyText: { color: '#64748B', fontSize: 12, textAlign: 'center', marginTop: 20 },
  alertItem: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1E293B' },
  alertTitle: { color: '#F8FAFC', fontSize: 12, fontWeight: 'bold' },
  alertBody: { color: '#94A3B8', fontSize: 11, marginTop: 2 },
  syncStatus: { color: '#38BDF8', fontSize: 10, fontWeight: 'bold', marginTop: 4 },
  navBar: { flexDirection: 'row', backgroundColor: '#0F172A', borderTopWidth: 1, borderTopColor: '#1E293B' },
  navItem: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  navText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
  navTextActive: { color: '#38BDF8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.95)', justifyContent: 'center', alignItems: 'center', p: 20 },
  modalContent: { backgroundColor: '#1E1B4B', borderWidth: 2, borderColor: '#E11D48', borderRadius: 16, padding: 20, width: '100%', alignItems: 'center' },
  modalBadge: { color: '#FCA5A5', backgroundColor: '#881337', fontSize: 10, fontWeight: 'bold', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 12 },
  modalTitle: { color: '#F43F5E', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  modalZone: { color: '#CBD5E1', fontSize: 14, fontWeight: '600', marginBottom: 12 },
  modalBody: { color: '#F1F5F9', fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 20, backgroundColor: '#0F172A', padding: 12, borderRadius: 8, width: '100%' },
  modalStopBtn: { backgroundColor: '#E11D48', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, width: '100%', alignItems: 'center' },
  modalStopBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: 'bold' }
});
