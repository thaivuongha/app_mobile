import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyboardAwareScrollView } from '@/components/KeyboardAwareScrollView';
import {
  createShareCode,
  getShareCodes,
  revokeShareCode,
  type ShareCodeItem,
} from '@/src/api/devices';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

const LABEL_MAX = 50;

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function errorText(e: unknown, fallback: string): string {
  if (!(e instanceof ApiClientError)) return fallback;
  const message = e.message as unknown;
  if (Array.isArray(message)) return message.join('\n');
  return typeof message === 'string' && message ? message : fallback;
}

export default function ShareDeviceScreen() {
  const queryClient = useQueryClient();
  const [naming, setNaming] = useState(false);
  const [label, setLabel] = useState('');
  const [revealed, setRevealed] = useState<{ id: string; label: string; code: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const createLock = useRef(false);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const markCopied = () => {
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const codesQuery = useQuery({
    queryKey: ['device-share-code'],
    queryFn: () => getShareCodes(),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => createShareCode(name),
    onSuccess: (res) => {
      setCopied(false);
      setRevealed({ id: res.id, label: res.label, code: res.code });
      setNaming(false);
      setLabel('');
      queryClient.invalidateQueries({ queryKey: ['device-share-code'] });
    },
    onError: (e) => {
      Alert.alert('Lỗi', errorText(e, 'Tạo mã thất bại. Vui lòng thử lại.'));
    },
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeShareCode(id),
    onSuccess: (_res, id) => {
      setRevealed((current) => (current?.id === id ? null : current));
      queryClient.invalidateQueries({ queryKey: ['device-share-code'] });
    },
    onError: (e) => {
      Alert.alert('Lỗi', errorText(e, 'Không xóa được mã. Vui lòng thử lại.'));
    },
  });

  const handleCreate = () => {
    const name = label.trim();
    if (!name) {
      Alert.alert('Vui lòng nhập tên');
      return;
    }
    // Mã chỉ hiện một lần. Bấm đúp trước khi nút kịp khóa sẽ tạo hai mã và giấu mã đầu.
    if (createLock.current || createMutation.isPending) return;
    createLock.current = true;
    createMutation.mutate(name, {
      onSettled: () => {
        createLock.current = false;
      },
    });
  };

  const confirmRevoke = (item: ShareCodeItem) => {
    Alert.alert(
      `Các thiết bị đang dùng mã của ${item.label} sẽ bị đăng xuất.`,
      undefined,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa mã',
          style: 'destructive',
          onPress: () => revokeMutation.mutate(item.id),
        },
      ],
    );
  };

  const handleCopy = async () => {
    if (!revealed) return;
    try {
      const saved = await Clipboard.setStringAsync(revealed.code);
      if (!saved) {
        Alert.alert('Không sao chép được', 'Vui lòng thử lại.');
        return;
      }
      markCopied();
    } catch {
      Alert.alert('Không sao chép được', 'Vui lòng thử lại.');
    }
  };

  if (codesQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (codesQuery.isError && !codesQuery.data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Không tải được</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => codesQuery.refetch()} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Bản server cũ không có `data` và POST sẽ xóa mã đang dùng. Không được tạo/xóa khi chưa thấy danh sách.
  const serverReady = Array.isArray(codesQuery.data?.data);
  if (!serverReady && codesQuery.isFetching) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }
  if (!serverReady) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Máy chủ chưa cập nhật</Text>
          <Text style={styles.errorHint}>Chưa thể tạo thêm mã. Hãy cập nhật backend rồi thử lại.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => codesQuery.refetch()} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const codes = codesQuery.data?.data ?? [];
  const busy = createMutation.isPending || revokeMutation.isPending;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <KeyboardAwareScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {revealed && (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>{revealed.label}</Text>
            <View style={styles.codeWell}>
              <Text style={styles.codeValue} selectable>
                {revealed.code}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.primaryBtn, copied && styles.copiedBtn]}
              onPress={handleCopy}
              activeOpacity={0.85}
            >
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{copied ? 'Đã sao chép' : 'Sao chép mã'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setRevealed(null)} activeOpacity={0.7}>
              <Text style={styles.doneBtnText}>Xong</Text>
            </TouchableOpacity>
          </View>
        )}

        {codes.length === 0 ? (
          <View style={styles.statusCard}>
            <View style={[styles.statusIcon, styles.statusIconOff]}>
              <Ionicons name="share-outline" size={22} color={Colors.textMuted} />
            </View>
            <View style={styles.statusTextBlock}>
              <Text style={styles.statusTitle}>Chưa có mã</Text>
            </View>
          </View>
        ) : (
          codes.map((item) => (
            <View key={item.id} style={styles.codeRow}>
              <View style={[styles.statusIcon, styles.statusIconOn]}>
                <Ionicons name="share" size={20} color={Colors.success} />
              </View>
              <View style={styles.statusTextBlock}>
                <Text style={styles.statusTitle} numberOfLines={1}>{item.label}</Text>
                <Text style={styles.statusSubtitle}>Tạo lúc {formatDateTime(item.createdAt)}</Text>
              </View>
              <TouchableOpacity
                onPress={() => confirmRevoke(item)}
                disabled={busy}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={`Xóa mã của ${item.label}`}
              >
                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          ))
        )}

        {revealed ? null : naming ? (
          <View style={styles.formCard}>
            <Text style={styles.fieldLabel}>Tên người nhận</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="Ví dụ: Chị Lan"
              placeholderTextColor={Colors.textMuted}
              maxLength={LABEL_MAX}
              editable={!createMutation.isPending}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <TouchableOpacity
              style={[styles.primaryBtn, (createMutation.isPending || !label.trim()) && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={createMutation.isPending || !label.trim()}
              activeOpacity={0.85}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryBtnText}>Tạo mã</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => {
                setNaming(false);
                setLabel('');
              }}
              disabled={createMutation.isPending}
              activeOpacity={0.7}
            >
              <Text style={styles.doneBtnText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, busy && styles.btnDisabled]}
            onPress={() => setNaming(true)}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>Tạo mã chia sẻ</Text>
          </TouchableOpacity>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 20, paddingTop: 12, gap: 12 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8, textAlign: 'center' },
  errorHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 22,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconOn: { backgroundColor: Colors.successLight },
  statusIconOff: { backgroundColor: Colors.surfaceElevated },
  statusTextBlock: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  statusSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  formCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },

  codeCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  codeLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  codeWell: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  codeValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  copiedBtn: { backgroundColor: Colors.success, shadowColor: Colors.success },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  doneBtn: { alignItems: 'center', justifyContent: 'center', height: 44 },
  doneBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  btnDisabled: { opacity: 0.6 },
});
