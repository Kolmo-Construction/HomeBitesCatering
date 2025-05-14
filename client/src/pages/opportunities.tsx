import { Route, Switch } from "wouter";
import OpportunityList from "@/components/opportunities/OpportunityList";
import OpportunityForm from "@/components/opportunities/OpportunityForm";
import OpportunityDetailPage from "./OpportunityDetailPage";

export default function Opportunities() {
  // This component acts as a sub-router for /opportunities/*
  return (
    <Switch>
      <Route path="/opportunities" component={OpportunityList} />
      <Route path="/opportunities/new">
        {() => <OpportunityForm isEditing={false} />}
      </Route>
      <Route path="/opportunities/:id/edit">
        {(params) => {
          const opportunityId = parseInt(params.id, 10);
          return <OpportunityForm key={opportunityId} isEditing={true} opportunityIdForEdit={opportunityId} />;
        }}
      </Route>
      <Route path="/opportunities/:id" component={OpportunityDetailPage} />
      <Route>
        <OpportunityList /> {/* Default fallback route */}
      </Route>
    </Switch>
  );
}