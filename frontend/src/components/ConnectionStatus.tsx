import { Tag } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

interface ConnectionStatusProps {
  isConnected: boolean;
  isConnecting?: boolean;
}

export default function ConnectionStatus({
  isConnected,
  isConnecting = false,
}: ConnectionStatusProps) {
  if (isConnecting) {
    return (
      <Tag icon={<LoadingOutlined />} color="processing">
        Connecting...
      </Tag>
    );
  }

  if (isConnected) {
    return (
      <Tag icon={<CheckCircleOutlined />} color="success">
        Connected
      </Tag>
    );
  }

  return (
    <Tag icon={<CloseCircleOutlined />} color="error">
      Disconnected
    </Tag>
  );
}
