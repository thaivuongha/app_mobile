import { useEffect, useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getShareCodeStatus,
  regenerateShareCode,
  revokeShareCode,
} from '@/src/api/devices';
import { ApiClientError } from '@/src/api/client';
import { Colors } from '@/constants/Colors';

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function ShareDeviceScreen() {
  const queryClient = useQueryClient();
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const statusQuery = useQuery({
    queryKey: ['device-share-code'],
    queryFn: () => getShareCodeStatus(),
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateShareCode,
    onSuccess: (res) => {
      setCopied(false);
      setRevealedCode(res.code);
      queryClient.invalidateQueries({ queryKey: ['device-share-code'] });
    },
    onError: (e) => {
      const message = e instanceof ApiClientError ? e.message : 'Tạo mã thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: revokeShareCode,
    onSuccess: () => {
      setCopied(false);
      setRevealedCode(null);
      queryClient.invalidateQueries({ queryKey: ['device-share-code'] });
    },
    onError: (e) => {
      const message = e instanceof ApiClientError ? e.message : 'Thao tác thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi', message);
    },
  });

  const confirmRegenerate = (hasExisting: boolean) => {
    Alert.alert(
      hasExisting ? 'Các thiết bị đang dùng mã hiện tại sẽ bị đăng xuất.' : 'Tạo mã chia sẻ?',
      hasExisting ? undefined : 'Nhân viên nhập mã này trong app để xem danh sách thiết bị cần châm thêm sản phẩm.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: hasExisting ? 'Tạo mã mới' : 'Tạo mã', onPress: () => regenerateMutation.mutate() },
      ],
    );
  };

  const confirmRevoke = () => {
    Alert.alert(
      'Các thiết bị đang dùng mã hiện tại sẽ bị đăng xuất.',
      undefined,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Ngừng chia sẻ', style: 'destructive', onPress: () => revokeMutation.mutate() },
      ],
    );
  };

  const handleCopy = async () => {
    if (!revealedCode) return;
    try {
      const saved = await Clipboard.setStringAsync(revealedCode);
      if (!saved) {
        Alert.alert('Không sao chép được', 'Vui lòng thử lại.');
        return;
      }
      markCopied();
    } catch {
      Alert.alert('Không sao chép được', 'Vui lòng thử lại.');
    }
  };

  const handleDismissCode = () => {
    setCopied(false);
    setRevealedCode(null);
  };

  if (statusQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Không có dữ liệu thì không được hiện "Chưa có mã": bấm tạo lúc này sẽ
  // thu hồi mã đang dùng mà không có câu cảnh báo.
  if (statusQuery.isError && !statusQuery.data) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['bottom']}>
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Không tải được</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => statusQuery.refetch()} activeOpacity={0.85}>
            <Text style={styles.retryBtnText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = statusQuery.data;
  const busy = regenerateMutation.isPending || revokeMutation.isPending;
  const sharing = !!status?.exists;

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {revealedCode ? (
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Mã chia sẻ</Text>
            <View style={styles.codeWell}>
              <Text style={styles.codeValue} selectable>
                {revealedCode}
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

            <TouchableOpacity style={styles.doneBtn} onPress={handleDismissCode} activeOpacity={0.7}>
              <Text style={styles.doneBtnText}>Xong</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.statusCard}>
              <View style={[styles.statusIcon, sharing ? styles.statusIconOn : styles.statusIconOff]}>
                <Ionicons
                  name={sharing ? 'share' : 'share-outline'}
                  size={22}
                  color={sharing ? Colors.success : Colors.textMuted}
                />
              </View>
              <View style={styles.statusTextBlock}>
                <Text style={styles.statusTitle}>{sharing ? 'Đang chia sẻ' : 'Chưa có mã'}</Text>
                <Text style={styles.statusSubtitle}>
                  {sharing && status?.createdAt
                    ? `Tạo lúc ${formatDateTime(status.createdAt)}`
                    : 'Tạo mã để nhân viên xem thiết bị'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={() => confirmRegenerate(sharing)}
              disabled={busy}
              activeOpacity={0.85}
            >
              {regenerateMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="key-outline" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>{sharing ? 'Tạo mã mới' : 'Tạo mã chia sẻ'}</Text>
                </>
              )}
            </TouchableOpacity>

            {sharing && (
              <TouchableOpacity
                style={[styles.dangerBtn, busy && styles.btnDisabled]}
                onPress={confirmRevoke}
                disabled={busy}
                activeOpacity={0.85}
              >
                {revokeMutation.isPending ? (
                  <ActivityIndicator color={Colors.danger} size="small" />
                ) : (
                  <Text style={styles.dangerBtnText}>Ngừng chia sẻ</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 20, paddingTop: 12 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
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
    marginBottom: 20,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconOn: { backgroundColor: Colors.successLight },
  statusIconOff: { backgroundColor: Colors.surfaceElevated },
  statusTextBlock: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  statusSubtitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },

  codeCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  codeLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: Colors.textMuted,
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

  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    marginTop: 4,
  },
  doneBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },

  dangerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    height: 52,
    marginTop: 10,
    backgroundColor: Colors.dangerLight,
  },
  dangerBtnText: { color: Colors.danger, fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
