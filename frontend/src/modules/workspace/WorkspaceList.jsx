export default function WorkspaceList({ workspaces = [], onSelect }) {
  return <section><h1>Your workspaces</h1>{workspaces.map((workspace) => <button key={workspace.id} onClick={() => onSelect?.(workspace)}>{workspace.name}</button>)}{workspaces.length === 0 && <p>No workspaces yet.</p>}</section>
}
