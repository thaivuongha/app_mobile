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
import { getMe, getMyProfile, updateMe, updateMyProfile } from '@/src/api/users';
import { ApiClientError } from '@/src/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '@/constants/Colors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FormField({
  label,
  icon,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
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
        />
      </View>
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');

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
      setFirstName(data.firstName ?? '');
      setLastName(data.lastName ?? '');
      setAddress(data.address ?? '');
    }
  }, [data?.id]);

  useEffect(() => {
    if (userData) {
      setEmail(userData.email ?? '');
    }
  }, [userData?.id]);

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      firstName?: string;
      lastName?: string;
      address?: string;
      email?: string;
    }) => {
      const { email: emailToUpdate, ...profilePayload } = payload;
      await updateMyProfile(profilePayload);
      // Email nằm trên User (không phải UserProfile) — cập nhật qua endpoint riêng.
      // Chỉ gửi khi có giá trị hợp lệ để tránh lỗi validate @IsEmail() khi để trống.
      if (emailToUpdate) {
        await updateMe({ email: emailToUpdate });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profiles', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
      Alert.alert('Thành công', 'Đã cập nhật hồ sơ.');
      router.back();
    },
    onError: (e) => Alert.alert('Lỗi', e instanceof ApiClientError ? e.message : 'Lưu thất bại'),
  });

  const handleSave = () => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !EMAIL_REGEX.test(trimmedEmail)) {
      Alert.alert('Email không hợp lệ', 'Vui lòng nhập đúng định dạng email (vd: ten@example.com)');
      return;
    }
    updateMutation.mutate({
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      address: address.trim() || undefined,
      email: trimmedEmail || undefined,
    });
  };

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
          <Text style={styles.avatarName}>{firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Chưa đặt tên'}</Text>
          <Text style={styles.avatarPhone}>{userData?.phoneNumber ?? ''}</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person-outline" size={16} color={Colors.primary} />
            <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
          </View>

          <FormField label="Họ" icon="person-outline" value={firstName} onChangeText={setFirstName} placeholder="Nguyễn" />
          <FormField label="Tên" icon="person-outline" value={lastName} onChangeText={setLastName} placeholder="Văn A" />
          <FormField label="Địa chỉ" icon="location-outline" value={address} onChangeText={setAddress} placeholder="Tùy chọn" />
        </View>

        {/* Email card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="mail-outline" size={16} color={Colors.primary} />
            <Text style={styles.cardTitle}>Email</Text>
          </View>
          <Text style={styles.cardHint}>
            Dùng để nhận mã đặt lại mật khẩu khi quên mật khẩu. Chưa dùng để đăng nhập.
          </Text>
          <FormField
            label="Địa chỉ email"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            placeholder="ten@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
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
              <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
            </>
          )}
        </TouchableOpacity>

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
  },
  btnDisabled: { opacity: 0.65 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
