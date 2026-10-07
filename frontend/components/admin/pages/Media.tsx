'use client';

import { MediaLibrary } from '../media/MediaLibrary';
import { Card, PageHeader } from '../ui/Layout';

export function MediaPage() {
  return (
    <>
      <PageHeader title="Media" description="Images and videos for website content. Uploaded files get a permanent URL you can use anywhere on the site." />
      <Card className="p-4"><MediaLibrary mode="page" /></Card>
    </>
  );
}
