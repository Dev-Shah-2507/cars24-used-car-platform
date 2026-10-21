export default function Loader({ text = 'Loading...' }) {
  return <div className="loader" role="status">{text}</div>;
}
