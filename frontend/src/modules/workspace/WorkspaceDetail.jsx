export default function WorkspaceDetail({ workspace }) {
  if (!workspace) return <p>Select a workspace to continue.</p>
  return <section><p>{workspace.type}</p><h1>{workspace.name}</h1><p>{workspace.memberCount} members · {workspace.progress}% progress</p></section>
}
