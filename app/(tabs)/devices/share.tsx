import { useState } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

  const statusQuery = useQuery({
    queryKey: ['device-share-code'],
    queryFn: () => getShareCodeStatus(),
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateShareCode,
    onSuccess: (res) => {
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
      hasExisting ? 'Tạo mã mới?' : 'Tạo mã chia sẻ?',
      hasExisting
        ? 'Mã cũ sẽ ngừng hoạt động ngay — nhân viên đang xem bằng mã cũ sẽ bị đăng xuất. Bạn cần gửi mã mới cho họ.'
        : 'Nhân viên nhập mã này trong app để xem danh sách thiết bị cần châm thêm sản phẩm.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: hasExisting ? 'Tạo mã mới' : 'Tạo mã', onPress: () => regenerateMutation.mutate() },
      ],
    );
  };

  const confirmRevoke = () => {
    Alert.alert(
      'Ngừng chia sẻ?',
      'Nhân viên đang xem bằng mã hiện tại sẽ bị đăng xuất ngay. Bạn có thể tạo mã mới bất cứ lúc nào.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Ngừng chia sẻ', style: 'destructive', onPress: () => revokeMutation.mutate() },
      ],
    );
  };

  if (statusQuery.isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const status = statusQuery.data;
  const busy = regenerateMutation.isPending || revokeMutation.isPending;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.iconBox}>
          <Ionicons name="people-outline" size={28} color={Colors.primary} />
        </View>
        <Text style={styles.title}>Chia sẻ cho nhân viên</Text>
        <Text style={styles.subtitle}>
          Cho nhân viên dọn dẹp (không cần tài khoản) xem danh sách thiết bị và sản phẩm cần
          châm thêm. Nhân viên cài app rồi vào "Nhập mã từ chủ" ở màn đăng nhập.
        </Text>

        {revealedCode ? (
          <View style={styles.revealBox}>
            <View style={styles.revealHeader}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
              <Text style={styles.revealHeaderText}>Mã mới đã tạo</Text>
            </View>
            <Text style={styles.revealCode}>{revealedCode}</Text>
            <Text style={styles.revealWarning}>
              ⚠️ Mã chỉ hiển thị DUY NHẤT lần này. Hãy gửi ngay cho nhân viên (đọc, chụp màn hình
              hoặc ghi lại) — nếu mất mã, bạn cần tạo mã mới.
            </Text>
            <TouchableOpacity style={styles.doneBtn} onPress={() => setRevealedCode(null)} activeOpacity={0.85}>
              <Text style={styles.doneBtnText}>Đã gửi cho nhân viên</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Ionicons
                name={status?.exists ? 'shield-checkmark-outline' : 'shield-outline'}
                size={20}
                color={status?.exists ? Colors.success : Colors.textMuted}
              />
              <View style={styles.statusTextBlock}>
                <Text style={styles.statusTitle}>
                  {status?.exists ? 'Đang chia sẻ' : 'Chưa chia sẻ'}
                </Text>
                {status?.exists && status.createdAt && (
                  <Text style={styles.statusSubtitle}>
                    Tạo lúc {formatDateTime(status.createdAt)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {!revealedCode && (
          <>
            <TouchableOpacity
              style={[styles.primaryBtn, busy && styles.btnDisabled]}
              onPress={() => confirmRegenerate(!!status?.exists)}
              disabled={busy}
              activeOpacity={0.85}
            >
              {regenerateMutation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="key-outline" size={18} color="#fff" />
                  <Text style={styles.primaryBtnText}>
                    {status?.exists ? 'Tạo mã mới' : 'Tạo mã chia sẻ'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {status?.exists && (
              <TouchableOpacity
                style={[styles.dangerBtn, busy && styles.btnDisabled]}
                onPress={confirmRevoke}
                disabled={busy}
                activeOpacity={0.85}
              >
                {revokeMutation.isPending ? (
                  <ActivityIndicator color={Colors.danger} size="small" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={18} color={Colors.danger} />
                    <Text style={styles.dangerBtnText}>Ngừng chia sẻ</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </>
        )}

        <View style={styles.noteBox}>
          <Ionicons name="information-circle-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.noteText}>
            Một mã dùng chung cho tất cả nhân viên. Màn nhân viên chỉ thấy tên sản phẩm, khe
            trống và mức pin — không thấy giá, thiết bị online hay thông tin nhạy cảm khác.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 24, alignItems: 'center' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.3 },
  subtitle: {
    fontSize: 13.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
  },

  statusCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    marginBottom: 20,
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusTextBlock: { flex: 1 },
  statusTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  statusSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },

  revealBox: {
    width: '100%',
    backgroundColor: Colors.successLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.success + '40',
    padding: 18,
    alignItems: 'center',
    marginBottom: 20,
  },
  revealHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  revealHeaderText: { fontSize: 13, fontWeight: '700', color: Colors.success },
  revealCode: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 2,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  revealWarning: {
    fontSize: 12.5,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 14,
  },
  doneBtn: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  primaryBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    marginBottom: 12,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  dangerBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.dangerLight,
    borderRadius: 14,
    height: 52,
    marginBottom: 12,
  },
  dangerBtnText: { color: Colors.danger, fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  noteBox: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  noteText: { flex: 1, fontSize: 12, color: Colors.textMuted, lineHeight: 17 },
});
