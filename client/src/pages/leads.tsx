import { Route, Switch } from "wouter";
import LeadList from "@/components/leads/LeadList";
import LeadForm from "@/components/leads/LeadForm";
import LeadDetailPage from "./LeadDetailPage"; // Import the new detail page

export default function Leads() {
  // This component now acts as a sub-router for /leads/*
  return (
    <Switch>
      <Route path="/leads" component={LeadList} />
      <Route path="/leads/new">
        {() => <LeadForm isEditing={false} />}
      </Route>
      <Route path="/leads/:id/edit">
        {(params) => {
          const leadId = parseInt(params.id, 10);
          return <LeadForm key={leadId} isEditing={true} leadIdForEdit={leadId} />;
        }}
      </Route>
      <Route path="/leads/:id" component={LeadDetailPage} /> {/* Use LeadDetailPage for viewing leads */}
      <Route>
        <LeadList /> {/* Default fallback route */}
      </Route>
    </Switch>
  );
}
