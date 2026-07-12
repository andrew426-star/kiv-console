import { getClients, getProjects, getTasks, getFormOptions } from "@/lib/company/queries";
import { deleteClientRecord, deleteProjectRecord, deleteTaskRecord } from "@/lib/company/actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientFormDialog } from "./client-form-dialog";
import { ProjectFormDialog } from "./project-form-dialog";
import { TaskFormDialog } from "./task-form-dialog";
import { DeleteButton } from "./delete-button";

export async function RecordsPanel() {
  const [clients, projects, tasks, options] = await Promise.all([
    getClients(),
    getProjects(),
    getTasks(),
    getFormOptions(),
  ]);

  return (
    <Card className="glow-border-hover">
      <CardHeader>
        <CardTitle className="font-heading">Records</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="clients">
          <TabsList>
            <TabsTrigger value="clients">Clients ({clients.length})</TabsTrigger>
            <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
            <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="flex flex-col gap-3 pt-3">
            <div className="flex justify-end">
              <ClientFormDialog triggerLabel="+ New client" />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-sm text-muted-foreground">
                      No clients yet. Add the first one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{client.status}</Badge>
                      </TableCell>
                      <TableCell className="flex justify-end gap-2">
                        <ClientFormDialog
                          triggerLabel="Edit"
                          triggerVariant="outline"
                          triggerSize="xs"
                          client={client}
                        />
                        <DeleteButton action={deleteClientRecord.bind(null, client.id)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="projects" className="flex flex-col gap-3 pt-3">
            <div className="flex justify-end">
              <ProjectFormDialog
                triggerLabel="+ New project"
                clients={options.clients}
                profiles={options.profiles}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      No projects yet. Add the first one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((project) => {
                    const client = project.clients as unknown as { name: string } | null;
                    const owner = project.profiles as unknown as { full_name: string } | null;
                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">{project.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {client?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {owner?.full_name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{project.status}</Badge>
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <ProjectFormDialog
                            triggerLabel="Edit"
                            triggerVariant="outline"
                            triggerSize="xs"
                            project={project}
                            clients={options.clients}
                            profiles={options.profiles}
                          />
                          <DeleteButton action={deleteProjectRecord.bind(null, project.id)} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="tasks" className="flex flex-col gap-3 pt-3">
            <div className="flex justify-end">
              <TaskFormDialog
                triggerLabel="+ New task"
                projects={options.projects}
                profiles={options.profiles}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">
                      No tasks yet. Add the first one above.
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => {
                    const project = task.projects as unknown as { name: string } | null;
                    const assignee = task.profiles as unknown as { full_name: string } | null;
                    return (
                      <TableRow key={task.id}>
                        <TableCell className="font-medium">{task.title}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {project?.name ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {assignee?.full_name ?? "Unassigned"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{task.status}</Badge>
                        </TableCell>
                        <TableCell className="flex justify-end gap-2">
                          <TaskFormDialog
                            triggerLabel="Edit"
                            triggerVariant="outline"
                            triggerSize="xs"
                            task={task}
                            projects={options.projects}
                            profiles={options.profiles}
                          />
                          <DeleteButton action={deleteTaskRecord.bind(null, task.id)} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
