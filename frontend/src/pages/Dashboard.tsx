import { Card, Typography } from 'antd';
import PriceBoard from '../components/PriceBoard';

const { Title } = Typography;

export default function Dashboard() {
  return (
    <div>
      {/* Page Title */}
      <Title level={2} style={{ marginBottom: 24 }}>
        Market Overview
      </Title>

      {/* Real-time Market Data */}
      <Card>
        <PriceBoard />
      </Card>
    </div>
  );
}
