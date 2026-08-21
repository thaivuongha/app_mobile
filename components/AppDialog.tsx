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

export type AppDialogTone = 'primary' | 'danger' | 'success';

export interface AppDialogAction {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
}

interface AppDialogProps {
  visible: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: AppDialogTone;
  title: string;
  message?: string;
  children?: React.ReactNode;
  /** false = không tắt bằng backdrop / nút back */
  dismissible?: boolean;
  onClose: () => void;
  actions?: AppDialogAction[];
}

const TONE = {
  primary: { color: Colors.primary, bg: Colors.primaryLight },
  danger: { color: Colors.danger, bg: Colors.dangerLight },
  success: { color: Colors.success, bg: Colors.successLight },
} as const;

/**
 * Dialog dùng chung — card trắng, cam #FF815C, cùng ngôn ngữ UI với popup hoa hồng / cập nhật app.
 */
export function AppDialog({
  visible,
  icon = 'information-circle',
  tone = 'primary',
  title,
  message,
  children,
  dismissible = true,
  onClose,
  actions,
}: AppDialogProps) {
  const palette = TONE[tone];
  const buttons =
    actions && actions.length > 0
      ? actions
      : [{ label: 'Đóng', onPress: onClose, variant: 'primary' as const }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        if (dismissible) onClose();
      }}
    >
      <View style={styles.overlay}>
        {dismissible ? (
          <Pressable style={styles.backdrop} onPress={onClose} />
        ) : (
          <View style={styles.backdrop} />
        )}

          <View pointerEvents="box-none" style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
            <Ionicons name={icon} size={26} color={palette.color} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}
          {children}
          <View style={styles.actions}>
            {buttons.map((btn) => {
              const variant = btn.variant ?? 'primary';
              return (
                <TouchableOpacity
                  key={btn.label}
                  style={[
                    styles.btn,
                    variant === 'ghost' && styles.btnGhost,
                    variant === 'primary' && styles.btnPrimary,
                    variant === 'danger' && styles.btnDanger,
                  ]}
                  onPress={btn.onPress}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      variant === 'ghost' && styles.btnGhostText,
                      variant === 'primary' && styles.btnPrimaryText,
                      variant === 'danger' && styles.btnDangerText,
                    ]}
                  >
                    {btn.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    lineHeight: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 14,
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
  btnDanger: {
    backgroundColor: Colors.danger,
  },
  btnDangerText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
