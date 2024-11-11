import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import Link from "@material-ui/core/Link";
import Typography from "@material-ui/core/Typography";
import React from "react";
import { Title } from "react-admin";

export const Dashboard = () => {

  return (
    <Card>
      <Title title="Sit With Me Admin" />
      <CardContent>
        <Typography gutterBottom variant="h5" component="h2">
          Welcome!
        </Typography>
        <br />
        <Typography variant="body2" color="textSecondary" component="p">
          This is dashboard page.
        </Typography>
        <br />
      </CardContent>
    </Card>
  );

};