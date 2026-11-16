import DesignEditor from '@/components/studio/DesignEditor';

export default async function StudioEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const designId = Number.parseInt(id, 10);
  return <DesignEditor designId={Number.isFinite(designId) ? designId : 0} />;
}
