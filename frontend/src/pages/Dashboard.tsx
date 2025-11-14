import { Card, Button, Typography, Space, Tag, Statistic, Row, Col } from 'antd';
import {
  LogoutOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import PriceBoard from '../components/PriceBoard';

const { Title, Text } = Typography;

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#f0f2f5',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <Card style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Space size="large">
              <Title level={3} style={{ margin: 0 }}>
                Fusio Trading Platform
              </Title>
              <Tag color="success">Development</Tag>
            </Space>
            <Button
              icon={<LogoutOutlined />}
              onClick={handleLogout}
              type="default"
            >
              Logout
            </Button>
          </div>
        </Card>

        {/* User Info */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="User Information" variant="borderless">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div>
                  <Text type="secondary">Email:</Text>
                  <br />
                  <Text strong>{user.email}</Text>
                </div>
                <div>
                  <Text type="secondary">Nickname:</Text>
                  <br />
                  <Text strong>{user.nickname}</Text>
                </div>
                <div>
                  <Text type="secondary">Role:</Text>
                  <br />
                  <Tag color="blue">{user.role.toUpperCase()}</Tag>
                </div>
                <div>
                  <Text type="secondary">Registered:</Text>
                  <br />
                  <Text>{new Date(user.createdAt).toLocaleString('en-US')}</Text>
                </div>
              </Space>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Account Balance" variant="borderless">
              <Statistic
                title="Virtual Balance (USDT)"
                value={user.balanceUsdt}
                precision={2}
                valueStyle={{ color: '#3f8600' }}
                prefix={<DollarOutlined />}
              />
              <div style={{ marginTop: 24 }}>
                <Text type="secondary">
                  This is virtual money for trading demo purposes
                </Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Welcome Card */}
        <Card
          style={{
            marginTop: 24,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
          }}
        >
          <Title level={4} style={{ color: 'white', marginBottom: 8 }}>
            Welcome back, {user.nickname}!
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>
            You have successfully logged into Fusio multi-exchange trading platform. More features coming soon...
          </Text>
        </Card>

        {/* Real-time Market Data */}
        <Card title="Real-time Market Data" style={{ marginTop: 24 }}>
          <PriceBoard />
        </Card>

        {/* Feature Roadmap */}
        <Card title="Feature Roadmap" style={{ marginTop: 24 }}>
          <Space direction="vertical" size="small">
            <div>
              <Tag color="success">✓ Completed</Tag>
              <Text>User registration and login system</Text>
            </div>
            <div>
              <Tag color="success">✓ Completed</Tag>
              <Text>Real-time market data dashboard</Text>
            </div>
            <div>
              <Tag color="default">Planned</Tag>
              <Text>Multi-exchange price aggregation</Text>
            </div>
            <div>
              <Tag color="default">Planned</Tag>
              <Text>Smart order routing</Text>
            </div>
            <div>
              <Tag color="default">Planned</Tag>
              <Text>Risk control system</Text>
            </div>
          </Space>
        </Card>
      </div>
    </div>
  );
}
