import { Ionicons } from '@expo/vector-icons';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Colors } from '@/constants/Colors';

export type AppUpdateKind = 'force' | 'soft';

interface AppUpdateModalProps {
  visible: boolean;
  kind: AppUpdateKind;
  message: string;
  currentVersion: string;
  latestVersion: string;
  onUpdate: () => void;
  /** Soft update: đóng modal. Force: không truyền / không hiện nút. */
  onLater?: () => void;
}

/** Modal cập nhật — cùng ngôn ngữ UI với popup hoa hồng (card trắng, cam #FF815C). */
export function AppUpdateModal({
  visible,
  kind,
  message,
  currentVersion,
  latestVersion,
  onUpdate,
  onLater,
}: AppUpdateModalProps) {
  const isForce = kind === 'force';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (!isForce) onLater?.();
      }}
    >
      <View style={styles.overlay}>
        {isForce ? (
          <View style={styles.backdrop} />
        ) : (
          <Pressable style={styles.backdrop} onPress={onLater} />
        )}

        <View style={styles.card}>
          <View style={[styles.iconWrap, isForce && styles.iconWrapForce]}>
            <Ionicons
              name={isForce ? 'alert-circle' : 'cloud-download-outline'}
              size={26}
              color={isForce ? Colors.danger : Colors.primary}
            />
          </View>

          <Text style={styles.title}>
            {isForce ? 'Cần cập nhật ứng dụng' : 'Đã có phiên bản mới'}
          </Text>

          <View style={styles.versionRow}>
            <Text style={styles.versionMuted}>v{currentVersion}</Text>
            <Ionicons name="arrow-forward" size={12} color={Colors.textMuted} />
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>v{latestVersion}</Text>
            </View>
          </View>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.actions}>
            {!isForce && (
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={onLater}
                activeOpacity={0.75}
              >
                <Text style={styles.btnGhostText}>Để sau</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary]}
              onPress={onUpdate}
              activeOpacity={0.85}
            >
              <Text style={styles.btnPrimaryText}>{isForce ? 'Cập nhật ngay' : 'Cập nhật'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.card,
    borderRadius: 20,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconWrapForce: {
    backgroundColor: Colors.dangerLight,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  versionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  versionMuted: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  versionBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  versionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnGhost: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnGhostText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  btnPrimary: {
    backgroundColor: Colors.primary,
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
