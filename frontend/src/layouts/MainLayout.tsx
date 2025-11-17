import { Layout, Menu, Card, Typography, Statistic, Button, Space } from 'antd';
import {
  LineChartOutlined,
  ShoppingOutlined,
  WalletOutlined,
  SettingOutlined,
  LogoutOutlined,
  DollarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const { Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    {
      key: 'market',
      icon: <LineChartOutlined />,
      label: 'Market',
      children: [
        { key: '/app/market/overview', label: 'Overview' },
        { key: '/app/market/comparison', label: 'Comparison' },
      ],
    },
    {
      key: 'trading',
      icon: <ShoppingOutlined />,
      label: 'Trading',
      children: [
        { key: '/app/trading/BTC-USDT?exchange=binance', label: 'Spot' },
        { key: '/app/trading/orders', label: 'Orders' },
      ],
    },
    {
      key: 'portfolio',
      icon: <WalletOutlined />,
      label: 'Portfolio',
      children: [
        { key: '/app/portfolio/balance', label: 'Balance' },
        { key: '/app/portfolio/history', label: 'History' },
      ],
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      children: [
        { key: '/app/settings/profile', label: 'Profile' },
        { key: '/app/settings/security', label: 'Security' },
      ],
    },
  ];

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={240}
        theme="dark"
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/app/market/overview')}
        >
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            FUSIO
          </Title>
        </div>

        {/* User Info Card */}
        <Card
          size="small"
          style={{
            margin: 16,
            background: 'var(--ant-color-fill-secondary)',
            border: 'none',
            cursor: 'pointer',
          }}
          onClick={() => navigate('/app/settings/profile')}
          hoverable
        >
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserOutlined style={{ color: 'var(--ant-color-text)', fontSize: 16 }} />
              <Text strong style={{ color: 'var(--ant-color-text)', fontSize: 14 }}>
                {user.nickname}
              </Text>
            </div>
            <Text style={{ color: 'var(--ant-color-text-secondary)', fontSize: 12 }}>
              {user.email}
            </Text>
            <Statistic
              value={user.balanceUsdt}
              precision={2}
              valueStyle={{ color: '#52c41a', fontSize: 16 }}
              prefix={<DollarOutlined />}
              suffix="USDT"
            />
          </Space>
        </Card>

        {/* Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          defaultOpenKeys={['market', 'trading', 'portfolio', 'settings']}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0 }}
        />

        {/* Logout Button */}
        <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
          <Button
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            block
            danger
            type="primary"
          >
            Logout
          </Button>
        </div>
      </Sider>

      <Layout style={{ marginLeft: 240 }}>
        <Content
          style={{
            padding: 24,
            minHeight: 280,
            background: 'var(--ant-color-bg-layout)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
