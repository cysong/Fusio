import { Card, Typography, Space, Tag } from 'antd';
import { RocketOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

interface ComingSoonPlaceholderProps {
  title: string;
  description?: string;
  version?: string;
}

export default function ComingSoonPlaceholder({
  title,
  description = 'This feature is under development and will be available soon.',
  version = 'Coming Soon',
}: ComingSoonPlaceholderProps) {
  return (
    <div style={{ padding: '48px 24px' }}>
      <Card>
        <Space
          direction="vertical"
          size="large"
          style={{
            textAlign: 'center',
            width: '100%',
            padding: '48px 24px',
          }}
        >
          <RocketOutlined style={{ fontSize: 72, color: '#1890ff' }} />
          <Title level={2} style={{ margin: 0 }}>
            {title}
          </Title>
          <Paragraph type="secondary" style={{ fontSize: 16, maxWidth: 600, margin: '0 auto' }}>
            {description}
          </Paragraph>
          <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
            {version}
          </Tag>
        </Space>
      </Card>
    </div>
  );
}
