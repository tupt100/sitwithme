import * as React from "react";
import { useMutation, Button } from 'react-admin';

const ResolveIssueButton = ({ record }) => {
  const [resolve, { loading }] = useMutation({
    type: 'update',
    resource: 'reportedProfiles',
    payload: { data: { id: record.id, status: "RESOLVED", completedAt: new Date().toISOString() } }
  });

  const [unresolve, { loading1 }] = useMutation({
    type: 'update',
    resource: 'reportedProfiles',
    payload: { data: { id: record.id, status: "UNRESOLVED", completedAt: null } }
  });

  if (record.completedAt) {
    return <Button label="Unresolve" onClick={unresolve} disabled={loading1} />;
  }

  return <Button label="Resolve" onClick={resolve} disabled={loading} />;
};

export default ResolveIssueButton;