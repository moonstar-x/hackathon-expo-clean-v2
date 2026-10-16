import { useEffect, useState } from 'react';
import { useMeasurementFile } from './files';
export function AuthenticatedImage({ id, kind, thumbnail = false }: { id: number; kind: 'floorPlan' | 'thumbnail'; thumbnail?: boolean }) {
  const { data, isPending, error } = useMeasurementFile(id, kind);
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!data) return;
    const value = URL.createObjectURL(data);
    // The object URL is an external resource with an explicit cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [data]);
  if (!url || error) return <span aria-label={error ? 'No se pudo cargar la imagen' : 'Cargando imagen'}>{isPending ? '…' : '▧'}</span>;
  return <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={thumbnail ? 'Miniatura' : 'Plano de la medición'} style={thumbnail ? { width: 48, height: 48, objectFit: 'contain', background: 'white' } : { display: 'block', width: '100%', maxHeight: '75vh', objectFit: 'contain', background: 'white' }} /></a>;
}
