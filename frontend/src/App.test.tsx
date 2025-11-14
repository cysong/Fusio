// 最简化的测试 App
function TestApp() {
  return (
    <div style={{
      padding: '50px',
      fontSize: '24px',
      color: 'red',
      background: 'yellow'
    }}>
      <h1>测试成功！如果你看到这个，React 工作正常</h1>
      <p>当前时间: {new Date().toLocaleString()}</p>
    </div>
  );
}

export default TestApp;
