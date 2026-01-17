import { X, Calendar, User, Tag, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DetailPanel({ isOpen, onClose }: DetailPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="w-80 border-l bg-card h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3>Details</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Project Info */}
          <div>
            <h4 className="mb-3">Project Alpha</h4>
            <p className="text-sm text-muted-foreground">
              A comprehensive overview of the current project status, milestones, and team progress.
            </p>
          </div>

          <Separator />

          {/* Metadata */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="text-sm">January 25, 2026</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Assigned To</p>
                <p className="text-sm">Sarah Johnson</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge>Active</Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Tags</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant="secondary">Design</Badge>
                  <Badge variant="secondary">UX</Badge>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Activity */}
          <div>
            <h4 className="mb-3">Recent Activity</h4>
            <div className="space-y-3">
              <div className="text-sm">
                <p className="text-muted-foreground">2 hours ago</p>
                <p>Updated project timeline</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">5 hours ago</p>
                <p>Added new team member</p>
              </div>
              <div className="text-sm">
                <p className="text-muted-foreground">1 day ago</p>
                <p>Project created</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full">Edit Project</Button>
            <Button variant="outline" className="w-full">
              View Full Details
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
