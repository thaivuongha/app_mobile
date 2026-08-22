import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMe, getMyProfile, updateMyProfile, requestEmailChange, resendEmailChangeOtp, verifyEmailChange, cancelEmailChange } from '@/src/api/users';
import { ApiClientError } from '@/src/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VN_MOBILE_PHONE_REGEX = /^(0[3|5|7|8|9])+([0-9]{8})$/;

function FormField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  editable = true,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputWrapper}>
        <View style={styles.inputIcon}>
          <Ionicons name={icon} size={16} color={Colors.textMuted} />
        </View>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
        />
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [address, setAddress] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ['user-profiles', 'me'],
    queryFn: getMyProfile,
  });

  const { data: userData } = useQuery({
    queryKey: ['users', 'me'],
    queryFn: getMe,
  });

  useEffect(() => {
    if (data) {
      setFirstName([data.firstName, data.lastName].filter(Boolean).join(' ').trim());
      setAddress(data.address ?? '');
      setContactPhone(data.contactPhone ?? '');
    }
  }, [data?.id]);

  useEffect(() => {
    if (userData) {
      setEmail(userData.pendingEmail || userData.email || '');
      if (userData.pendingEmail) {
        setOtpSent(true);
      }
    }
  }, [userData?.id, userData?.email, userData?.pendingEmail]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      firstName: string;
      address: string;
      contactPhone: string;
    }) => {
      await updateMyProfile({ ...payload, lastName: '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profiles', 'me'] });
      Alert.alert('Thành công', 'Đã cập nhật thông tin liên hệ.');
      router.back();
    },
    onError: (e) => Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Lưu thất bại'),
  });

  const requestEmailMutation = useMutation({
    mutationFn: () => requestEmailChange(email.trim().toLowerCase(), currentPassword),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      setOtpSent(true);
      setOtpCode('');
      setCooldown(60);
      Alert.alert('Đã gửi mã', res.message);
    },
    onError: (e) => Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Không gửi được mã'),
  });

  const resendEmailMutation = useMutation({
    mutationFn: () => resendEmailChangeOtp(),
    onSuccess: (res) => {
      setCooldown(60);
      Alert.alert('Đã gửi lại', res.message);
    },
    onError: (e) => Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Gửi lại thất bại'),
  });

  const verifyEmailMutation = useMutation({
    mutationFn: () => verifyEmailChange(otpCode),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      setOtpSent(false);
      setOtpCode('');
      setCurrentPassword('');
      setEmail(res.email);
      Alert.alert('Thành công', res.message);
    },
    onError: (e) => Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Xác thực thất bại'),
  });

  const cancelEmailMutation = useMutation({
    mutationFn: () => cancelEmailChange(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      setOtpSent(false);
      setOtpCode('');
      setEmail(userData?.email ?? '');
      Alert.alert('Đã hủy', 'Email trên tài khoản không đổi.');
    },
    onError: (e) => Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Hủy thất bại'),
  });

  const handleSave = () => {
    const trimmedName = firstName.trim();
    const trimmedAddress = address.trim();
    const trimmedContactPhone = contactPhone.trim();
    if (!trimmedName || !trimmedAddress || !trimmedContactPhone) {
      Alert.alert('Thiếu thông tin liên hệ', 'Vui lòng nhập họ tên, địa chỉ và số điện thoại liên hệ');
      return;
    }
    if (!VN_MOBILE_PHONE_REGEX.test(trimmedContactPhone)) {
      Alert.alert('Số điện thoại không hợp lệ', 'Vui lòng nhập SĐT Việt Nam 10 số (đầu 03, 05, 07, 08, 09)');
      return;
    }
    updateMutation.mutate({
      firstName: trimmedName,
      address: trimmedAddress,
      contactPhone: trimmedContactPhone,
    });
  };

  const handleSendEmailOtp = () => {
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(trimmed)) {
      Alert.alert('Email không hợp lệ', 'Vui lòng nhập đúng định dạng email (vd: ten@example.com)');
      return;
    }
    if (userData?.email && trimmed === userData.email) {
      Alert.alert('Email không đổi', 'Email mới phải khác email hiện tại trên tài khoản.');
      return;
    }
    if (!currentPassword) {
      Alert.alert('Thiếu mật khẩu', 'Nhập mật khẩu hiện tại để xác nhận bạn là chủ tài khoản.');
      return;
    }
    requestEmailMutation.mutate();
  };

  const handleVerifyEmail = () => {
    if (!/^\d{6}$/.test(otpCode)) {
      Alert.alert('Mã không hợp lệ', 'Vui lòng nhập đúng 6 chữ số nhận được qua email mới.');
      return;
    }
    verifyEmailMutation.mutate();
  };

  const confirmedEmail = userData?.email ?? '';
  const pendingEmail = userData?.pendingEmail;
  const emailBusy =
    requestEmailMutation.isPending ||
    resendEmailMutation.isPending ||
    verifyEmailMutation.isPending ||
    cancelEmailMutation.isPending;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Avatar placeholder */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLetter}>
              {firstName ? firstName[0].toUpperCase() : (userData?.phoneNumber?.[0] ?? 'U')}
            </Text>
          </View>
          <Text style={styles.avatarName}>{firstName.trim() || 'Chưa đặt tên'}</Text>
          <Text style={styles.avatarPhone}>{userData?.phoneNumber ?? ''}</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={16} color={Colors.primary} />
            <Text style={styles.cardTitle}>Thông tin liên hệ</Text>
          </View>
          <Text style={styles.cardHint}>
            Embox dùng để liên hệ khi cần hỗ trợ. Khác với số điện thoại đăng nhập.
          </Text>

          <FormField label="Họ và tên" icon="person-outline" value={firstName} onChangeText={setFirstName} placeholder="Nguyễn Văn A" autoCapitalize="words" />
          <FormField label="Địa chỉ" icon="location-outline" value={address} onChangeText={setAddress} placeholder="Số nhà, đường, quận/huyện, tỉnh/thành" autoCapitalize="sentences" />
          <FormField
            label="Số điện thoại liên hệ"
            icon="call-outline"
            value={contactPhone}
            onChangeText={setContactPhone}
            placeholder="0901 234 567"
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, updateMutation.isPending && styles.btnDisabled]}
          onPress={handleSave}
          disabled={updateMutation.isPending}
          activeOpacity={0.85}
        >
          {updateMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-outline" size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Lưu thông tin liên hệ</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Email card — OTP bắt buộc; không ghi qua PATCH /users/me */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="mail-outline" size={16} color={Colors.primary} />
            <Text style={styles.cardTitle}>Email</Text>
          </View>
          <Text style={styles.cardHint}>
            Kênh nhận mã quên mật khẩu — không dùng để đăng nhập. Đổi email phải nhập mật khẩu hiện tại và mã OTP gửi tới địa chỉ mới. Email cũ vẫn hiệu lực cho tới khi xác thực xong.
          </Text>
          {confirmedEmail ? (
            <Text style={styles.confirmedEmail}>Hiện tại: {confirmedEmail}</Text>
          ) : (
            <Text style={styles.confirmedEmail}>Chưa có email trên tài khoản</Text>
          )}
          {pendingEmail ? (
            <Text style={styles.pendingBanner}>Đang chờ xác thực: {pendingEmail}</Text>
          ) : null}

          <FormField
            label="Email mới"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="ten@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!otpSent && !emailBusy}
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Mật khẩu hiện tại</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.inputIcon}>
                <Ionicons name="lock-closed-outline" size={16} color={Colors.textMuted} />
              </View>
              <TextInput
                style={styles.input}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Để xác nhận chủ tài khoản"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPwd}
                autoCapitalize="none"
                editable={!emailBusy}
              />
              <TouchableOpacity onPress={() => setShowPwd((v) => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {!otpSent ? (
            <TouchableOpacity
              style={[styles.secondaryBtn, emailBusy && styles.btnDisabled]}
              onPress={handleSendEmailOtp}
              disabled={emailBusy}
              activeOpacity={0.85}
            >
              {requestEmailMutation.isPending ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <Text style={styles.secondaryBtnText}>Gửi mã xác thực</Text>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Mã OTP (6 số)</Text>
                <View style={styles.inputWrapper}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="keypad-outline" size={16} color={Colors.textMuted} />
                  </View>
                  <TextInput
                    style={styles.input}
                    value={otpCode}
                    onChangeText={(t) => setOtpCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                    placeholder="123456"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={6}
                    editable={!emailBusy}
                  />
                </View>
              </View>
              <TouchableOpacity
                style={[styles.saveBtn, emailBusy && styles.btnDisabled]}
                onPress={handleVerifyEmail}
                disabled={emailBusy}
                activeOpacity={0.85}
              >
                {verifyEmailMutation.isPending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Xác nhận đổi email</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => resendEmailMutation.mutate()}
                disabled={emailBusy || cooldown > 0}
              >
                <Text style={[styles.linkBtnText, (emailBusy || cooldown > 0) && { opacity: 0.5 }]}>
                  {cooldown > 0 ? `Gửi lại mã (${cooldown}s)` : 'Gửi lại mã'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => cancelEmailMutation.mutate()}
                disabled={emailBusy}
              >
                <Text style={styles.linkBtnMuted}>Hủy yêu cầu đổi email</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 20 },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5,
    marginBottom: 10,
  },
  avatarLetter: { fontSize: 28, fontWeight: '800', color: '#fff' },
  avatarName: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  avatarPhone: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },

  card: {
    backgroundColor: Colors.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 20,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  cardHint: { fontSize: 12, color: Colors.textMuted, marginTop: -8, marginBottom: 14 },

  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: 12, height: 48,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },

  saveBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, height: 54,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
    marginBottom: 20,
  },
  btnDisabled: { opacity: 0.65 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  confirmedEmail: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 10 },
  pendingBanner: {
    fontSize: 12, fontWeight: '600', color: Colors.primary,
    backgroundColor: Colors.background, paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: 8, marginBottom: 12,
  },
  secondaryBtn: {
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 12, height: 48, marginTop: 4,
  },
  secondaryBtnText: { color: Colors.primary, fontSize: 15, fontWeight: '700' },
  linkBtn: { alignItems: 'center', paddingVertical: 10 },
  linkBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  linkBtnMuted: { fontSize: 13, color: Colors.textMuted },
});
