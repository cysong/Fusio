import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { useAuthStore } from '../stores/authStore';
import type { RegisterRequest } from '../types/auth';

const { Title, Text } = Typography;

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      message.success('Registration successful!');
      navigate('/dashboard');
    },
    onError: (error: Error) => {
      message.error(error.message || 'Registration failed, please try again');
    },
  });

  const onFinish = (values: any) => {
    // Remove confirmPassword, only send fields needed by backend
    const { confirmPassword, ...registerData } = values;
    registerMutation.mutate(registerData as RegisterRequest);
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{
          width: 450,
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 8 }}>
            Create Account
          </Title>
          <Text type="secondary">Start your trading journey</Text>
        </div>

        <Form
          name="register"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email address' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="your@email.com"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="nickname"
            label="Nickname (Optional)"
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Set your nickname"
              size="large"
              maxLength={50}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 8, message: 'Password must be at least 8 characters' },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]/,
                message: 'Password must contain uppercase, lowercase letters and numbers',
              },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="At least 8 characters with uppercase, lowercase and numbers"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Enter password again"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={registerMutation.isPending}
              block
              size="large"
            >
              Sign Up
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">
              Already have an account? <Link to="/login">Sign In</Link>
            </Text>
          </div>
        </Form>
      </Card>
    </div>
  );
}
