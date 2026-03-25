import TaskDetailClient from "./TaskDetailClient";

export function generateStaticParams() {
    return [{ id: 'default' }];
}

export const dynamicParams = false;

export default function Page() {
    return <TaskDetailClient />;
}
