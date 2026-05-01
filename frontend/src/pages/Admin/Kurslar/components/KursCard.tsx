import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Edit, Trash2 } from 'lucide-react';
import { DrivingSchool } from '@/services/api-service';

interface KursCardProps {
  kurs: DrivingSchool;
  onViewDetails: (kurs: DrivingSchool) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  getOwnerName: (owner_id: string | number | null | undefined) => string;
  getManagerName: (manager_id: string | number | null | undefined) => string;
}

const KursCard: React.FC<KursCardProps> = ({ 
  kurs, 
  onViewDetails, 
  onEdit, 
  onDelete,
  getOwnerName,
  getManagerName 
}) => (
  <Card className="mb-4 hover:shadow-md transition-shadow">
    <CardHeader>
      <CardTitle className="text-lg font-semibold">{kurs.name || "İsimsiz Kurs"}</CardTitle>
      <CardDescription className="text-sm text-gray-600">{kurs.address}</CardDescription>
    </CardHeader>
    <CardContent className="py-2">
      <div className="space-y-2 text-sm">
        <div><span className="font-medium">Telefon:</span> {kurs.phone}</div>
        <div><span className="font-medium">Kurs Sahibi:</span> {getOwnerName(kurs.owner_id)}</div>
        <div><span className="font-medium">Kurs Yöneticisi:</span> {getManagerName(kurs.manager_id)}</div>
      </div>
    </CardContent>
    <CardFooter className="flex justify-between pt-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => onViewDetails(kurs)}
        className="text-blue-600 border-blue-600 hover:bg-blue-50"
      >
        Detay
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
      <div className="flex space-x-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onEdit(kurs.id)}
          className="text-blue-600 hover:bg-blue-50"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => onDelete(kurs.id)}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </CardFooter>
  </Card>
);

export default KursCard;
