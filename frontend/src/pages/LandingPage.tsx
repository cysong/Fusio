import { useState } from "react";
import {
  Button,
  Typography,
  Space,
  Row,
  Col,
  Card,
  Modal,
  Form,
  Input,
  message,
  Alert,
} from "antd";
import {
  RocketOutlined,
  LineChartOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
} from "@ant-design/icons";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth";
import { useAuthStore } from "../stores/authStore";
import type { LoginRequest, RegisterRequest } from "../types/auth";

const { Title, Paragraph, Text } = Typography;

export default function LandingPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [registerModalVisible, setRegisterModalVisible] = useState(false);
  const [loginForm] = Form.useForm();
  const [registerForm] = Form.useForm();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      message.success("Login successful!");
      setLoginModalVisible(false);
      loginForm.resetFields();
      navigate("/app/market/overview");
    },
    onError: (error: Error) => {
      // Error will be shown in the Alert component in the Modal
      message.error(error.message || "Login failed, please try again");
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken);
      message.success("Registration successful!");
      setRegisterModalVisible(false);
      registerForm.resetFields();
      navigate("/app/market/overview");
    },
    onError: (error: Error) => {
      // Error will be shown in the Alert component in the Modal
      message.error(error.message || "Registration failed, please try again");
    },
  });

  const handleLogin = (values: LoginRequest) => {
    loginMutation.mutate(values);
  };

  const handleRegister = (
    values: RegisterRequest & { confirmPassword?: string }
  ) => {
    // Remove confirmPassword before sending to backend
    const { confirmPassword, ...registerData } = values;
    registerMutation.mutate(registerData);
  };

  const switchToRegister = () => {
    setLoginModalVisible(false);
    setRegisterModalVisible(true);
  };

  const switchToLogin = () => {
    setRegisterModalVisible(false);
    setLoginModalVisible(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#fff",
          borderBottom: "1px solid #f0f0f0",
          padding: "16px 48px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Title
            level={3}
            style={{ margin: 0, color: "#1890ff", cursor: "pointer" }}
            onClick={() =>
              navigate(isAuthenticated ? "/app/market/overview" : "/")
            }
          >
            FUSIO
          </Title>
          <Space>
            {isAuthenticated ? (
              <Button
                type="primary"
                size="large"
                onClick={() => navigate("/app/market/overview")}
              >
                Go to Dashboard
              </Button>
            ) : (
              <>
                <Button size="large" onClick={() => setLoginModalVisible(true)}>
                  Login
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={() => setRegisterModalVisible(true)}
                >
                  Try It Now
                </Button>
              </>
            )}
          </Space>
        </div>
      </div>

      {/* Hero Section */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          padding: "80px 48px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <Title
            level={1}
            style={{ color: "#fff", fontSize: 48, marginBottom: 24 }}
          >
            Trade Smarter Across Multiple Exchanges
          </Title>
          <Paragraph
            style={{
              fontSize: 20,
              color: "rgba(255,255,255,0.9)",
              marginBottom: 32,
            }}
          >
            Fusio aggregates real-time crypto prices from Binance, Bybit, and
            OKX - helping you find the best price instantly.
          </Paragraph>
          {isAuthenticated ? (
            <Paragraph style={{ fontSize: 18, color: "#fff", marginTop: 24 }}>
              You are already logged in,{" "}
              <a
                onClick={() => navigate("/app/market/overview")}
                style={{
                  color: "#fff",
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                go to dashboard
              </a>
            </Paragraph>
          ) : (
            <Space size="large">
              <Button
                type="primary"
                size="large"
                icon={<RocketOutlined />}
                onClick={() => setRegisterModalVisible(true)}
                style={{
                  height: 48,
                  fontSize: 18,
                  padding: "0 32px",
                  background: "#fff",
                  color: "#667eea",
                  border: "none",
                }}
              >
                Try It Now
              </Button>
              <Button
                size="large"
                onClick={() => setLoginModalVisible(true)}
                style={{
                  height: 48,
                  fontSize: 18,
                  padding: "0 32px",
                  background: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  border: "1px solid rgba(255,255,255,0.5)",
                }}
              >
                Login
              </Button>
            </Space>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div style={{ padding: "80px 48px", background: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Title level={2} style={{ textAlign: "center", marginBottom: 48 }}>
            Core Features
          </Title>
          <Row gutter={[32, 32]}>
            <Col xs={24} md={8}>
              <Card hoverable style={{ textAlign: "center", height: "100%" }}>
                <LineChartOutlined
                  style={{ fontSize: 48, color: "#1890ff", marginBottom: 16 }}
                />
                <Title level={4}>Real-time Market Data</Title>
                <Paragraph type="secondary">
                  Track live prices across multiple exchanges with WebSocket
                  streaming. Never miss a price movement.
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card hoverable style={{ textAlign: "center", height: "100%" }}>
                <ThunderboltOutlined
                  style={{ fontSize: 48, color: "#52c41a", marginBottom: 16 }}
                />
                <Title level={4}>Smart Order Routing</Title>
                <Paragraph type="secondary">
                  Automatically route orders to the exchange with the best
                  price. Maximize your profits.
                </Paragraph>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  (Coming in V0.4)
                </Text>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card hoverable style={{ textAlign: "center", height: "100%" }}>
                <SafetyOutlined
                  style={{ fontSize: 48, color: "#fa8c16", marginBottom: 16 }}
                />
                <Title level={4}>Risk Control System</Title>
                <Paragraph type="secondary">
                  Built-in risk management with balance checks and circuit
                  breakers. Trade with confidence.
                </Paragraph>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  (Coming in V0.6)
                </Text>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      {/* Tech Section */}
      <div style={{ padding: "80px 48px", background: "#f0f2f5" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Title level={2} style={{ textAlign: "center", marginBottom: 32 }}>
            Tech That Powers It
          </Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card>
                <Title level={4}>Backend</Title>
                <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                  Node.js + NestJS, Socket.IO push, TypeORM for data, JWT +
                  Passport for auth.
                </Paragraph>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  Redis + Bull for async and queueing, Axios for exchange
                  integrations.
                </Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card>
                <Title level={4}>Frontend</Title>
                <Paragraph type="secondary" style={{ marginBottom: 8 }}>
                  React 19 + Vite, Ant Design, socket.io-client for live
                  streams, Zustand for trading state.
                </Paragraph>
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  TanStack Query for caching, lightweight-charts for pro
                  charting.
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      {/* Exchanges Section */}
      <div style={{ padding: "80px 48px", background: "#f0f2f5" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", textAlign: "center" }}>
          <Title level={2} style={{ marginBottom: 24 }}>
            Supported Exchanges
          </Title>
          <Paragraph
            type="secondary"
            style={{ fontSize: 16, marginBottom: 48 }}
          >
            Currently integrated with 3 major cryptocurrency exchanges
          </Paragraph>
          <Space size="large" wrap>
            <Card style={{ width: 200 }}>
              <Title level={4} style={{ color: "#F3BA2F" }}>
                Binance
              </Title>
            </Card>
            <Card style={{ width: 200 }}>
              <Title level={4} style={{ color: "#F7A600" }}>
                Bybit
              </Title>
            </Card>
            <Card style={{ width: 200 }}>
              <Title level={4} style={{ color: "#000" }}>
                OKX
              </Title>
            </Card>
          </Space>
        </div>
      </div>

      {/* Roadmap Section */}
      <div style={{ padding: "80px 48px", background: "#fff" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Title level={2} style={{ textAlign: "center", marginBottom: 48 }}>
            Development Roadmap
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card>
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: "100%" }}
                >
                  <Text strong style={{ color: "#52c41a" }}>
                    Completed
                  </Text>
                  <Paragraph style={{ margin: 0 }}>
                    V0.1 - User Authentication System
                  </Paragraph>
                  <Paragraph style={{ margin: 0 }}>
                    V0.2 - Real-time Market Data
                  </Paragraph>
                  <Paragraph style={{ margin: 0 }}>
                    V0.3 - Multi-Exchange Integration
                  </Paragraph>
                  <Paragraph style={{ margin: 0 }}>
                    V0.4 - Trading Execution System
                  </Paragraph>
                </Space>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card>
                <Space
                  direction="vertical"
                  size="small"
                  style={{ width: "100%" }}
                >
                  <Text strong style={{ color: "#1890ff" }}>
                    Coming Soon
                  </Text>
                  <Paragraph style={{ margin: 0 }}>
                    V0.5 - Smart Order Routing
                  </Paragraph>
                  <Paragraph style={{ margin: 0 }}>
                    V0.6 - Risk Control System
                  </Paragraph>
                </Space>
              </Card>
            </Col>
          </Row>
        </div>
      </div>

      {/* CTA Section */}
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "#fff",
          padding: "80px 48px",
          textAlign: "center",
        }}
      >
        <Title level={2} style={{ color: "#fff", marginBottom: 24 }}>
          Ready to Start Trading?
        </Title>
        <Button
          type="primary"
          size="large"
          icon={<RocketOutlined />}
          onClick={() => setRegisterModalVisible(true)}
          style={{
            height: 48,
            fontSize: 18,
            padding: "0 32px",
            background: "#fff",
            color: "#667eea",
            border: "none",
          }}
        >
          Try It Now - Free Demo Account
        </Button>
      </div>

      {/* Footer */}
      <div
        style={{
          background: "#001529",
          color: "#fff",
          padding: "24px 48px",
          textAlign: "center",
        }}
      >
        <Text style={{ color: "rgba(255,255,255,0.65)" }}>
          © 2025 Fusio | Multi-Exchange Trading Platform | Tech Demo
        </Text>
      </div>

      {/* Login Modal */}
      <Modal
        title="Login to Fusio"
        open={loginModalVisible}
        onCancel={() => {
          setLoginModalVisible(false);
          loginForm.resetFields();
          loginMutation.reset();
        }}
        footer={null}
        width={400}
      >
        {loginMutation.isError && (
          <Alert
            message="Login Failed"
            description={
              loginMutation.error?.message ||
              "Please check your credentials and try again."
            }
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            onClose={() => loginMutation.reset()}
          />
        )}
        <Form form={loginForm} onFinish={handleLogin} layout="vertical">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Please enter a valid email address" },
            ]}
          >
            <Input prefix={<UserOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "Please enter your password" }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loginMutation.isPending}
            >
              Login
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center" }}>
            <Text type="secondary">Don't have an account? </Text>
            <Button
              type="link"
              onClick={switchToRegister}
              style={{ padding: 0 }}
            >
              Sign Up
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Register Modal */}
      <Modal
        title="Create Your Account"
        open={registerModalVisible}
        onCancel={() => {
          setRegisterModalVisible(false);
          registerForm.resetFields();
          registerMutation.reset();
        }}
        footer={null}
        width={400}
      >
        {registerMutation.isError && (
          <Alert
            message="Registration Failed"
            description={
              registerMutation.error?.message ||
              "Please check your information and try again."
            }
            type="error"
            showIcon
            closable
            style={{ marginBottom: 16 }}
            onClose={() => registerMutation.reset()}
          />
        )}
        <Form form={registerForm} onFinish={handleRegister} layout="vertical">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Please enter a valid email address" },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>

          <Form.Item
            name="nickname"
            rules={[{ required: true, message: "Please enter your nickname" }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Nickname"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: "Please enter your password" },
              {
                min: 8,
                message: "Password must be at least 8 characters",
              },
              {
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                message:
                  "Password must contain uppercase, lowercase, and number",
              },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password (min 8 chars)"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            dependencies={["password"]}
            rules={[
              { required: true, message: "Please confirm your password" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("password") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Passwords do not match"));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Confirm Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={registerMutation.isPending}
            >
              Sign Up
            </Button>
          </Form.Item>

          <div style={{ textAlign: "center" }}>
            <Text type="secondary">Already have an account? </Text>
            <Button type="link" onClick={switchToLogin} style={{ padding: 0 }}>
              Login
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
