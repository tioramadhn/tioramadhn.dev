interface VideoProps {
  url: string;
}

export default function Video({ url }: VideoProps) {
  return <video src={url} autoPlay muted controlsList="nodownload" />;
}
