import { ContentLayout } from "@/components/common/content-layout";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { appConfig } from "@/config/app";
import { useDocumentTitle } from "@/hooks/use-document-title";

interface PlaceholderPageProps { title:string; description:string; }
export function PlaceholderPage({title,description}:PlaceholderPageProps):React.JSX.Element { useDocumentTitle(`${appConfig.name} · ${title}`);return <ContentLayout><PageHeader title={title} description={description}/><EmptyState/></ContentLayout>; }
