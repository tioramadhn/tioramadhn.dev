export default function Video({ url }) {
  return <video src={url} autoPlay muted controlsList="nodownload"></video>;
}
