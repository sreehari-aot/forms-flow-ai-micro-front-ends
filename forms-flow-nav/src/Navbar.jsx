import React, { useEffect, useMemo, useState } from "react";
import { Navbar, Container, Nav, NavDropdown } from "react-bootstrap";
import { Link, BrowserRouter } from "react-router-dom";
import { getUserRoleName, getUserRolePermission } from "./helper/user";
import createURLPathMatchExp from "./helper/regExp/pathMatch";
import { useTranslation } from "react-i18next";
import {
  CLIENT,
  STAFF_REVIEWER,
  APPLICATION_NAME,
  STAFF_DESIGNER,
  MULTITENANCY_ENABLED,
  ADMIN_ROLE,
} from "./constants/constants";
import "./Navbar.css";
import { StorageService } from "@formsflow/service";
import { fetchSelectLanguages, updateUserlang } from "./services/language";
import i18n from "./resourceBundles/i18n";
import { fetchTenantDetails } from "./services/tenant";
import { setShowApplications } from "./constants/userContants";

const NavBar = React.memo(({ props }) => {
  const [instance, setInstance] = React.useState(props.getKcInstance());
  const [tenant, setTenant] = React.useState({});
  const [location, setLocation] = React.useState({ pathname: "/" });
  const [form, setForm] = React.useState({});
  const [selectLanguages, setSelectLanguages] = React.useState([]);
  const [applicationTitle, setApplicationTitle] = React.useState("");
  const [tenantLogo, setTenantLogo] = React.useState("/logo_skeleton.svg");

  React.useEffect(() => {
    props.subscribe("FF_AUTH", (msg, data) => {
      setInstance(data);
    });

    props.subscribe("ES_TENANT", (msg, data) => {
      if (data) {
        setTenant(data);
        if (!JSON.parse(StorageService.get("TENANT_DATA"))?.name) {
          StorageService.save("TENANT_DATA", JSON.stringify(data.tenantData));
        }
      }
    });
    props.subscribe("ES_ROUTE", (msg, data) => {
      if (data) {
        setLocation(data);
      }
    });
    props.subscribe("ES_FORM", (msg, data) => {
      if (data) {
        setForm(data);
      }
    });
  }, []);

  React.useEffect(() => {
    if (MULTITENANCY_ENABLED && !tenant.tenantId && instance?.isAuthenticated) {
      fetchTenantDetails(setTenant);
    }
  }, [instance]);

  React.useEffect(() => {
    const data = JSON.parse(StorageService.get("TENANT_DATA"));
    if (data?.details) {
      setApplicationTitle(data?.details?.applicationTitle);
      setTenantLogo(data?.details?.customLogo?.logo || "/logo.svg");
    }
  }, [tenant]);

  const isAuthenticated = instance?.isAuthenticated();
  const { pathname } = location;
  const [userDetail, setUserDetail] = React.useState({});

  const [lang, setLang] = React.useState(userDetail?.locale);
  const userRoles = JSON.parse(
    StorageService.get(StorageService.User.USER_ROLE)
  );
  const showApplications = setShowApplications(userDetail?.groups);
  const tenantKey = tenant?.tenantId;
  const formTenant = form?.tenantKey;
  const baseUrl = MULTITENANCY_ENABLED ? `/tenant/${tenantKey}/` : "/";

  /**
   * For anonymous forms the only way to identify the tenant is through the
   * form data with current implementation. To redirect to the correct tenant
   * we will use form as the data source for the tenantKey
   */

  const [loginUrl, setLoginUrl] = useState(baseUrl);

  const logoPath = MULTITENANCY_ENABLED
    ? tenantLogo
    : document.documentElement.style.getPropertyValue("--navbar-logo-path") ||
      "/logo.svg";
  const getAppName = useMemo(
    () => () => {
      if (!MULTITENANCY_ENABLED) {
        return APPLICATION_NAME;
      }
      // TODO: Need a propper fallback component prefered a skeleton.
      return applicationTitle || "";
    },
    [MULTITENANCY_ENABLED, applicationTitle]
  );
  const appName = getAppName();
  const { t } = useTranslation();

  useEffect(() => {
    if (!isAuthenticated && formTenant && MULTITENANCY_ENABLED) {
      setLoginUrl(`/tenant/${formTenant}/`);
    }
  }, [isAuthenticated, formTenant]);

  useEffect(() => {
    fetchSelectLanguages((data) => {
      setSelectLanguages(data);
    });
  }, []);

  useEffect(() => {
    props.publish("ES_CHANGE_LANGUAGE", lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("lang", lang);
  }, [lang]);

  React.useEffect(() => {
    setUserDetail(
      JSON.parse(StorageService.get(StorageService.User.USER_DETAILS))
    );
  }, [instance]);

  React.useEffect(() => {
    if (!lang) {
      const locale = instance?.getUserData()?.locale;
      setLang(locale);
    }
  }, [instance]);

  const handleOnclick = (selectedLang) => {
    setLang(selectedLang);
    updateUserlang(selectedLang, instance);
  };

  const logout = () => {
    instance.userLogout();
  };

  return (
    <BrowserRouter>
      <header>
        <Navbar expand="lg" className="topheading-border-bottom" fixed="top">
          <Container fluid>
            <Navbar.Brand className="d-flex">
              <Link to={`${baseUrl}`}>
                <img
                  className="img-fluid custom-logo"
                  src={logoPath}
                  width="50"
                  height="55"
                  alt="Logo"
                />
              </Link>
              <div className="custom-app-name">{appName}</div>
            </Navbar.Brand>
            <Navbar.Toggle aria-controls="responsive-navbar-nav " />
            {isAuthenticated ? (
              <Navbar.Collapse
                id="responsive-navbar-nav"
                className="navbar-nav"
              >
                <Nav
                  id="main-menu-nav"
                  className="active align-items-lg-center"
                >
                  <Nav.Link
                    as={Link}
                    to={`${baseUrl}form`}
                    className={`main-nav nav-item ${
                      pathname.match(createURLPathMatchExp("form", baseUrl))
                        ? "active-tab"
                        : "inactive-tab"
                    }`}
                  >
                    <i className="fa fa-wpforms fa-fw fa-lg mr-2" />
                    {t("Forms")}
                  </Nav.Link>
                  {getUserRolePermission(userRoles, ADMIN_ROLE) ? (
                    <Nav.Link
                      as={Link}
                      to={`${baseUrl}admin/dashboard`}
                      className={`main-nav nav-item ${
                        pathname.match(createURLPathMatchExp("admin", baseUrl))
                          ? "active-tab"
                          : "inactive-tab"
                      }`}
                    >
                      <i className="fa fa-user-circle-o fa-lg mr-2" />
                      {t("Admin")}
                    </Nav.Link>
                  ) : null}

                  {getUserRolePermission(userRoles, STAFF_DESIGNER) ? (
                    <Nav.Link
                      as={Link}
                      to={`${baseUrl}processes`}
                      className={`main-nav nav-item ${
                        pathname.match(
                          createURLPathMatchExp("processes", baseUrl)
                        )
                          ? "active-tab"
                          : "inactive-tab"
                      }`}
                    >
                      <i className="fa fa-cogs fa-lg fa-fw mr-2" />
                      {t("Processes")}
                    </Nav.Link>
                  ) : null}

                  {showApplications ? (
                    getUserRolePermission(userRoles, STAFF_REVIEWER) ||
                    getUserRolePermission(userRoles, CLIENT) ? (
                      <Nav.Link
                        as={Link}
                        to={`${baseUrl}application`}
                        className={`main-nav nav-item ${
                          pathname.match(
                            createURLPathMatchExp("application", baseUrl)
                          )
                            ? "active-tab"
                            : pathname.match(
                                createURLPathMatchExp("draft", baseUrl)
                              )
                            ? "active-tab"
                            : "inactive-tab"
                        }`}
                      >
                        {" "}
                        <i className="fa fa-list-alt fa-fw fa-lg mr-2" />
                        {t("Applications")}
                      </Nav.Link>
                    ) : null
                  ) : null}
                  {getUserRolePermission(userRoles, STAFF_REVIEWER) ? (
                    <Nav.Link
                      as={Link}
                      to={`${baseUrl}task`}
                      className={`main-nav nav-item taskDropdown ${
                        pathname.match(createURLPathMatchExp("task", baseUrl))
                          ? "active-tab"
                          : "inactive-tab"
                      }`}
                    >
                      {" "}
                      <i className="fa fa-list fa-lg fa-fw mr-2" />
                      {t("Tasks")}
                    </Nav.Link>
                  ) : null}

                  {getUserRolePermission(userRoles, STAFF_REVIEWER) ? (
                    <Nav.Link
                      as={Link}
                      to={`${baseUrl}metrics`}
                      data-testid="Dashboards"
                      className={`main-nav nav-item ${
                        pathname.match(
                          createURLPathMatchExp("metrics", baseUrl)
                        ) ||
                        pathname.match(
                          createURLPathMatchExp("insights", baseUrl)
                        )
                          ? "active-tab"
                          : "inactive-tab"
                      }`}
                    >
                      {" "}
                      <i className="fa fa-tachometer fa-lg fa-fw mr-2" />
                      {t("Dashboards")}
                    </Nav.Link>
                  ) : null}
                </Nav>

                <Nav className="px-lg-0 px-3">
                  {selectLanguages.length === 1 ? (
                    selectLanguages.map((e, i) => {
                      return (
                        <>
                          <i className="fa fa-globe fa-lg mr-1 mt-1" />
                          <h4 key={i}>{e.name}</h4>
                        </>
                      );
                    })
                  ) : (
                    <NavDropdown
                      title={
                        <>
                          <i className="fa fa-globe fa-lg mr-2" />
                          {lang ? lang : "LANGUAGE"}
                        </>
                      }
                      id="basic-nav-dropdown"
                    >
                      {selectLanguages.map((e, index) => (
                        <NavDropdown.Item
                          key={index}
                          onClick={() => {
                            handleOnclick(e.name);
                          }}
                        >
                          {e.value}{" "}
                        </NavDropdown.Item>
                      ))}
                    </NavDropdown>
                  )}
                </Nav>

                <Nav className="px-lg-0 px-3">
                  <NavDropdown
                    title={
                      <>
                        <i className="fa fa-user fa-lg mr-1" />
                        {userDetail?.name ||
                          userDetail?.preferred_username ||
                          ""}
                      </>
                    }
                  >
                    <NavDropdown.Item>
                      {" "}
                      {userDetail?.name || userDetail?.preferred_username}
                      <br />
                      <i className="fa fa-users fa-lg fa-fw" />
                      <b>{getUserRoleName(userRoles)}</b>
                    </NavDropdown.Item>
                    <NavDropdown.Divider />
                    <NavDropdown.Item onClick={logout}>
                      <i className="fa fa-sign-out fa-fw" /> {t("Logout")}{" "}
                    </NavDropdown.Item>
                  </NavDropdown>
                </Nav>
              </Navbar.Collapse>
            ) : (
              <Link to={loginUrl} className="btn btn-primary">
                Login
              </Link>
            )}
          </Container>
        </Navbar>
      </header>
    </BrowserRouter>
  );
});

export default NavBar;
