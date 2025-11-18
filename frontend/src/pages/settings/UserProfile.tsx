import {
  Card,
  Typography,
  Space,
  Tag,
  Statistic,
  Row,
  Col,
  Descriptions,
} from "antd";
import {
  DollarOutlined,
  UserOutlined,
  MailOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
  LoginOutlined,
} from "@ant-design/icons";
import { useAuthStore } from "../../stores/authStore";
import { useNavigate } from "react-router-dom";

const { Title, Text } = Typography;

export default function UserProfile() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (!user) {
    navigate("/");
    return null;
  }

  return (
    <div>
      {/* Page Title */}
      <Title level={2} style={{ marginBottom: 24 }}>
        User Profile
      </Title>

      {/* User Information */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Account Information">
            <Descriptions column={1} bordered>
              <Descriptions.Item
                label={
                  <>
                    <MailOutlined /> Email
                  </>
                }
              >
                {user.email}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <>
                    <UserOutlined /> Nickname
                  </>
                }
              >
                {user.nickname}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <>
                    <SafetyCertificateOutlined /> Role
                  </>
                }
              >
                <Tag color="blue">{user.role.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <>
                    <LoginOutlined /> Last Login
                  </>
                }
              >
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "N/A"}
                {` · IP: ${user.lastLoginIp || "N/A"}`}
              </Descriptions.Item>
              <Descriptions.Item
                label={
                  <>
                    <CalendarOutlined /> Registered
                  </>
                }
              >
                {new Date(user.createdAt).toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="Account Balance">
            <Statistic
              title="Virtual Balance (USDT)"
              value={user.balanceUsdt}
              precision={2}
              valueStyle={{ color: "#3f8600", fontSize: 32 }}
              prefix={<DollarOutlined />}
            />
            <div style={{ marginTop: 24 }}>
              <Text type="secondary">
                This is virtual money for trading demo purposes. Your initial
                balance was 10,000 USDT.
              </Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Welcome Card */}
      <Card
        style={{
          marginTop: 24,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <Space direction="vertical" size="middle">
          <Title level={4} style={{ color: "white", marginBottom: 0 }}>
            Welcome to Fusio, {user.nickname}!
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.85)" }}>
            You are using the Fusio multi-exchange trading platform. This is a
            technology demonstration showcasing real-time market data
            aggregation from Binance, Bybit, and OKX.
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.85)" }}>
            More features like trading execution, smart order routing, and risk
            control are coming soon in future releases.
          </Text>
        </Space>
      </Card>

      {/* Feature Status */}
      <Card title="Feature Roadmap" style={{ marginTop: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Text strong style={{ color: "#52c41a" }}>
                ✅Completed Features
              </Text>
              <div>
                <Tag color="success">V0.1</Tag>
                <Text>User Authentication System</Text>
              </div>
              <div>
                <Tag color="success">V0.2</Tag>
                <Text>Real-time Market Data Dashboard</Text>
              </div>
              <div>
                <Tag color="success">V0.3</Tag>
                <Text>Multi-Exchange Integration (Binance, Bybit, OKX)</Text>
              </div>
              <div>
                <Tag color="success">V0.4</Tag>
                <Text>Trading Execution System</Text>
              </div>
            </Space>
          </Col>

          <Col xs={24} md={12}>
            <Space direction="vertical" size="small" style={{ width: "100%" }}>
              <Text strong style={{ color: "#1890ff" }}>
                ⏳Coming Soon
              </Text>
              <div>
                <Tag color="blue">V0.5</Tag>
                <Text>Smart Order Routing</Text>
              </div>
              <div>
                <Tag color="blue">V0.6</Tag>
                <Text>Risk Control System</Text>
              </div>
              <div>
                <Tag color="blue">V0.7</Tag>
                <Text>Monitoring & Observability</Text>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

